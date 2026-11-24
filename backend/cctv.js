const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const createReportWriteQueue = require('./report-write-queue');
const { getOptionalInstallationDate } = require('./report-date');
const {
  findSavedRequest,
  parseRequestId,
  recordSavedRequest,
  verifySavedRequest,
} = require('./report-idempotency');
const {
  buildCctvPhotoFilename,
  findCctvCameraById,
  findCctvReportRowMismatch,
  normalizeCctvWriteError,
  writeCctvReportRow,
} = require('./cctv-report');

const router = express.Router();
const serializeCctvWrite = createReportWriteQueue();
const publicBackendUrl = new URL(
  process.env.PUBLIC_BACKEND_URL || 'https://bimanual-alisa-unsuperfluous.ngrok-free.dev',
).origin;
const cameraDatabasePath = path.join(__dirname, 'public', 'SQL_cctv_backend.json');
const cctvExcelPath = process.env.CCTV_EXCEL_PATH
  || 'C:/Users/jmunozav/Johnson Controls/Giovanni Parra - Mantenimiento Sistemas/FADS/Informe_automatizado/informe_cctv_jci.xlsx';
const cctvImagesDir = process.env.CCTV_IMAGES_DIR
  || path.join(path.dirname(cctvExcelPath), 'fotos_cctv');
const cctvExcelLockPath = path.join(path.dirname(cctvExcelPath), `~$${path.basename(cctvExcelPath)}`);

fs.mkdirSync(cctvImagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, cctvImagesDir),
  filename: (req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    try {
      callback(null, buildCctvPhotoFilename(file.fieldname, req.body?.idDispositivo, extension, uniqueSuffix));
    } catch (error) {
      callback(error);
    }
  },
});
const upload = multer({ storage });
const cctvUpload = upload.fields([
  { name: 'fotoAntes', maxCount: 1 },
  { name: 'fotoDespues', maxCount: 1 },
]);

const removeUploadedFiles = (files) => {
  files.forEach((file) => {
    try {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (error) {
      console.warn(`No se pudo eliminar la foto CCTV ${file?.path}:`, error.message);
    }
  });
};

router.get('/dispositivos', (_req, res) => {
  try {
    const cameras = JSON.parse(fs.readFileSync(cameraDatabasePath, 'utf8'));
    if (!Array.isArray(cameras)) {
      throw new Error('La base de cámaras CCTV no contiene una lista válida.');
    }
    res.json(cameras);
  } catch (error) {
    console.error('Error al leer la base de cámaras CCTV:', error);
    res.status(500).json({ error: error.message || 'No se pudo cargar la base de cámaras CCTV.' });
  }
});

router.get('/fotos/:filename', (req, res, next) => {
  const { filename } = req.params;
  if (!/^[A-Z0-9_-]+\.jpe?g$/i.test(filename)) {
    return res.status(400).json({ error: 'Nombre de foto CCTV no válido.' });
  }

  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(cctvImagesDir, filename), (error) => {
    if (!error) return;
    if (res.headersSent) return next(error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'No se encontró la foto CCTV.' });
    }
    return next(error);
  });
});

router.post('/registrar', cctvUpload, async (req, res) => {
  const uploadedFiles = Object.values(req.files || {}).flat();
  let workbookSaved = false;

  try {
    const {
      idDispositivo,
      tecnico,
      estadoInicial,
      estadoFinal,
      observacion,
      instalacionNueva,
      requestId: rawRequestId,
    } = req.body;
    const requestId = parseRequestId(rawRequestId);
    if (!idDispositivo) {
      const error = new Error('El ID de la cámara es obligatorio.');
      error.statusCode = 400;
      throw error;
    }

    const cameras = JSON.parse(fs.readFileSync(cameraDatabasePath, 'utf8'));
    if (!Array.isArray(cameras)) {
      throw new Error('La base de cámaras CCTV no contiene una lista válida.');
    }
    const camera = findCctvCameraById(cameras, idDispositivo);
    if (!camera) {
      const error = new Error(`El ID ${idDispositivo} no aparece en la base de cámaras CCTV.`);
      error.statusCode = 400;
      throw error;
    }

    if (!fs.existsSync(cctvExcelPath)) {
      const error = new Error(`No se encontró el archivo de CCTV en la ruta: ${cctvExcelPath}`);
      error.statusCode = 404;
      throw error;
    }

    let selectedItems;
    try {
      selectedItems = JSON.parse(req.body.checklistItems || '[]');
    } catch {
      const error = new Error('Datos de inspección CCTV inválidos: no se pudo leer la lista de casillas.');
      error.statusCode = 400;
      throw error;
    }

    const beforePhoto = req.files?.fotoAntes?.[0] || null;
    const afterPhoto = req.files?.fotoDespues?.[0] || null;
    const registrationDate = new Date().toISOString().slice(0, 10);
    const installationDate = getOptionalInstallationDate(instalacionNueva, registrationDate);
    const photoUrl = (file) => (file
      ? `${publicBackendUrl}/api/cctv/fotos/${encodeURIComponent(path.basename(file.path))}`
      : '');
    const registration = {
      camera,
      date: registrationDate,
      technician: String(tecnico || ''),
      initialState: String(estadoInicial || ''),
      finalState: String(estadoFinal || ''),
      installationDate,
      observation: String(observacion || ''),
      selectedItems,
      photoLinks: {
        photoBefore: photoUrl(beforePhoto),
        photoAfter: photoUrl(afterPhoto),
      },
    };

    const { result, responsePayload, duplicate } = await serializeCctvWrite(async () => {
      if (!fs.existsSync(cctvExcelPath)) {
        const error = new Error(`No se encontró el archivo de CCTV en la ruta: ${cctvExcelPath}`);
        error.statusCode = 404;
        throw error;
      }
      if (fs.existsSync(cctvExcelLockPath)) {
        const error = new Error('El informe CCTV está abierto en Excel. Ciérrelo e intente de nuevo.');
        error.statusCode = 409;
        throw error;
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(cctvExcelPath);
      const previousRequest = findSavedRequest(workbook, requestId);
      if (previousRequest) {
        if (
          previousRequest.sheetName !== 'Registro cctv'
          || !verifySavedRequest(workbook, previousRequest)
        ) {
          const error = new Error(
            'Este envío ya existe en el Excel CCTV, pero no se pudo verificar su fila. No se creó otro registro.',
          );
          error.statusCode = 409;
          throw error;
        }
        return { responsePayload: previousRequest.response, duplicate: true };
      }

      const worksheet = workbook.getWorksheet('Registro cctv');
      if (!worksheet) {
        const error = new Error('La hoja Registro cctv no existe en el archivo.');
        error.statusCode = 400;
        throw error;
      }

      const result = await writeCctvReportRow(worksheet, registration);
      const expectedValues = {
        item: result.item,
        id: camera.ID,
        phase: camera.FASE ?? '',
        location: camera.UBICACION ?? '',
        date: registration.date,
        technician: registration.technician,
        initialState: registration.initialState,
        finalState: registration.finalState,
        observation: registration.observation,
        ...result.values,
        photoBefore: registration.photoLinks.photoBefore,
        photoAfter: registration.photoLinks.photoAfter,
      };
      const responsePayload = {
        success: true,
        inspectionSaved: true,
        item: result.item,
        fila: result.row + 1,
        dispositivo: camera.ID,
        fase: camera.FASE || '',
        ubicacion: camera.UBICACION || '',
        fotos: { antes: registration.photoLinks.photoBefore, despues: registration.photoLinks.photoAfter },
      };
      recordSavedRequest(workbook, {
        requestId,
        sheetName: 'Registro cctv',
        rowNumber: result.row + 1,
        columns: result.columns,
        expectedValues,
        response: responsePayload,
      });

      await workbook.xlsx.writeFile(cctvExcelPath);
      workbookSaved = true;

      const verificationWorkbook = new ExcelJS.Workbook();
      await verificationWorkbook.xlsx.readFile(cctvExcelPath);
      const verificationWorksheet = verificationWorkbook.getWorksheet('Registro cctv');
      const verificationRow = verificationWorksheet?.getRow(result.row + 1);
      const savedRequest = findSavedRequest(verificationWorkbook, requestId);
      const mismatch = findCctvReportRowMismatch(verificationRow, result.columns, expectedValues);
      if (
        mismatch
        || (requestId && (!savedRequest || !verifySavedRequest(verificationWorkbook, savedRequest)))
      ) {
        throw new Error(
          `El Excel CCTV se escribió, pero no se pudo verificar el campo ${mismatch ? mismatch[0] : 'identificador de solicitud'}.`,
        );
      }
      return { result, responsePayload, duplicate: false };
    });

    if (duplicate) removeUploadedFiles(uploadedFiles);
    console.log(duplicate
      ? `Reintento idempotente confirmado: ${cctvExcelPath}, fila ${responsePayload.fila}.`
      : `Registro CCTV confirmado: ${cctvExcelPath}, fila ${result.row + 1}, ítem ${result.item}.`);
    res.json(responsePayload);
  } catch (error) {
    if (!workbookSaved) removeUploadedFiles(uploadedFiles);
    const responseError = normalizeCctvWriteError(error, workbookSaved);
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      console.log('El archivo del informe CCTV está bloqueado:', error.code);
    } else {
      console.error('Error al procesar el registro CCTV:', error);
    }
    res.status(responseError.statusCode).json({ error: responseError.message });
  }
});

module.exports = router;
