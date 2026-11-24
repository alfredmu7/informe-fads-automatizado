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
  buildSacsPhotoFilename,
  findSacsDeviceByIdAndItem,
  findSacsReportRowMismatch,
  normalizeSacsWriteError,
  writeSacsReportRow,
} = require('./sacs-report');

const router = express.Router();
const serializeSacsWrite = createReportWriteQueue();
const publicBackendUrl = new URL(
  process.env.PUBLIC_BACKEND_URL || 'https://bimanual-alisa-unsuperfluous.ngrok-free.dev',
).origin;
const deviceDatabasePath = path.join(__dirname, 'public', 'SQL_sacs_backend.json');
const sacsExcelPath = process.env.SACS_EXCEL_PATH
  || 'C:/Users/jmunozav/Johnson Controls/Giovanni Parra - Mantenimiento Sistemas/FADS/Informe_automatizado/informe_sacs_jci.xlsx';
const sacsImagesDir = process.env.SACS_IMAGES_DIR
  || path.join(path.dirname(sacsExcelPath), 'fotos_sacs');
const sacsExcelLockPath = path.join(path.dirname(sacsExcelPath), `~$${path.basename(sacsExcelPath)}`);

fs.mkdirSync(sacsImagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, sacsImagesDir),
  filename: (req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    try {
      callback(
        null,
        buildSacsPhotoFilename(file.fieldname, req.body?.idDispositivo, path.extname(file.originalname), uniqueSuffix),
      );
    } catch (error) {
      callback(error);
    }
  },
});
const upload = multer({ storage });
const sacsUpload = upload.fields([
  { name: 'fotoAntes', maxCount: 1 },
  { name: 'fotoDespues', maxCount: 1 },
]);

const removeUploadedFiles = (files) => {
  files.forEach((file) => {
    try {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (error) {
      console.warn(`No se pudo eliminar la foto SACS ${file?.path}:`, error.message);
    }
  });
};

router.get('/dispositivos', (_req, res) => {
  try {
    const devices = JSON.parse(fs.readFileSync(deviceDatabasePath, 'utf8'));
    if (!Array.isArray(devices)) throw new Error('La base de dispositivos SACS no contiene una lista válida.');
    res.json(devices);
  } catch (error) {
    console.error('Error al leer la base de dispositivos SACS:', error);
    res.status(500).json({ error: error.message || 'No se pudo cargar la base de dispositivos SACS.' });
  }
});

router.get('/fotos/:filename', (req, res, next) => {
  const { filename } = req.params;
  if (!/^[A-Z0-9_-]+\.jpe?g$/i.test(filename)) {
    return res.status(400).json({ error: 'Nombre de foto SACS no válido.' });
  }

  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(sacsImagesDir, filename), (error) => {
    if (!error) return;
    if (res.headersSent) return next(error);
    if (error.statusCode === 404) return res.status(404).json({ error: 'No se encontró la foto SACS.' });
    return next(error);
  });
});

router.post('/registrar', sacsUpload, async (req, res) => {
  const uploadedFiles = Object.values(req.files || {}).flat();
  let workbookSaved = false;
  let requestId = '';
  let deviceIdForLog = '';

  try {
    const {
      hoja,
      idDispositivo,
      itemDispositivo,
      tecnico,
      general,
      observacion,
      instalacionNueva,
      requestId: rawRequestId,
    } = req.body;
    requestId = parseRequestId(rawRequestId);
    deviceIdForLog = String(idDispositivo || '');

    if (!idDispositivo || !itemDispositivo) {
      const error = new Error('Selecciona un dispositivo de la base SACS.');
      error.statusCode = 400;
      throw error;
    }

    const devices = JSON.parse(fs.readFileSync(deviceDatabasePath, 'utf8'));
    if (!Array.isArray(devices)) throw new Error('La base de dispositivos SACS no contiene una lista válida.');
    const device = findSacsDeviceByIdAndItem(devices, idDispositivo, itemDispositivo);
    if (!device) {
      const error = new Error('El dispositivo seleccionado no aparece en la base SACS. Búscalo de nuevo.');
      error.statusCode = 400;
      throw error;
    }

    if (!fs.existsSync(sacsExcelPath)) {
      const error = new Error(`No se encontró el archivo de SACS en la ruta: ${sacsExcelPath}`);
      error.statusCode = 404;
      throw error;
    }

    let selectedItems;
    let numericValues;
    try {
      selectedItems = JSON.parse(req.body.checklistItems || '[]');
      numericValues = JSON.parse(req.body.numericValues || '{}');
    } catch {
      const error = new Error('Datos SACS inválidos: no se pudo leer el checklist o los valores numéricos.');
      error.statusCode = 400;
      throw error;
    }

    const registrationDate = new Date().toISOString().slice(0, 10);
    const installationDate = getOptionalInstallationDate(instalacionNueva, registrationDate);
    const photoUrl = (file) => (file
      ? `${publicBackendUrl}/api/sacs/fotos/${encodeURIComponent(path.basename(file.path))}`
      : '');
    const registration = {
      sheetName: hoja,
      device,
      date: registrationDate,
      technician: String(tecnico || ''),
      general: String(general || ''),
      installationDate,
      observation: String(observacion || ''),
      selectedItems,
      numericValues,
      photoLinks: {
        photoBefore: photoUrl(req.files?.fotoAntes?.[0]),
        photoAfter: photoUrl(req.files?.fotoDespues?.[0]),
      },
    };

    const { result, responsePayload, duplicate } = await serializeSacsWrite(async () => {
      if (!fs.existsSync(sacsExcelPath)) {
        const error = new Error(`No se encontró el archivo de SACS en la ruta: ${sacsExcelPath}`);
        error.statusCode = 404;
        throw error;
      }
      if (fs.existsSync(sacsExcelLockPath)) {
        const error = new Error('El informe SACS está abierto en Excel. Ciérralo e intenta de nuevo.');
        error.statusCode = 409;
        throw error;
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(sacsExcelPath);
      const previousRequest = findSavedRequest(workbook, requestId);
      if (previousRequest) {
        if (previousRequest.sheetName !== hoja || !verifySavedRequest(workbook, previousRequest)) {
          const error = new Error(
            'Este envío ya existe en el Excel SACS, pero no se pudo verificar su fila. No se creó otro registro.',
          );
          error.statusCode = 409;
          throw error;
        }
        return { responsePayload: previousRequest.response, duplicate: true };
      }

      const worksheet = workbook.getWorksheet(hoja);
      if (!worksheet) {
        const error = new Error(`La pestaña ${hoja} no existe en el archivo SACS.`);
        error.statusCode = 400;
        throw error;
      }

      const result = await writeSacsReportRow(worksheet, registration);
      const expectedValues = {
        ...result.values,
        photoBefore: registration.photoLinks.photoBefore,
        photoAfter: registration.photoLinks.photoAfter,
      };
      const responsePayload = {
        success: true,
        inspectionSaved: true,
        requestId,
        hoja,
        fila: result.row + 1,
        item: result.item,
        dispositivo: device.ID,
        ubicacion: device.UBICACION || '',
        fotos: {
          antes: registration.photoLinks.photoBefore,
          despues: registration.photoLinks.photoAfter,
        },
      };
      recordSavedRequest(workbook, {
        requestId,
        sheetName: hoja,
        rowNumber: result.row + 1,
        columns: result.columns,
        expectedValues,
        response: responsePayload,
      });

      await workbook.xlsx.writeFile(sacsExcelPath);
      workbookSaved = true;

      const verificationWorkbook = new ExcelJS.Workbook();
      await verificationWorkbook.xlsx.readFile(sacsExcelPath);
      const verificationWorksheet = verificationWorkbook.getWorksheet(hoja);
      const verificationRow = verificationWorksheet?.getRow(result.row + 1);
      const savedRequest = findSavedRequest(verificationWorkbook, requestId);
      const mismatch = findSacsReportRowMismatch(verificationRow, result.columns, expectedValues);
      if (
        mismatch
        || (requestId && (!savedRequest || !verifySavedRequest(verificationWorkbook, savedRequest)))
      ) {
        throw new Error(
          `El Excel SACS se escribió, pero no se pudo verificar el campo ${mismatch ? mismatch[0] : 'identificador de solicitud'}.`,
        );
      }
      return { result, responsePayload, duplicate: false };
    });

    if (duplicate) removeUploadedFiles(uploadedFiles);
    console.log(duplicate
      ? `Reintento idempotente confirmado: ID ${device.ID}, archivo ${sacsExcelPath}, pestaña ${hoja}, fila ${responsePayload.fila}, solicitud ${requestId || 'legacy'}.`
      : `Registro SACS confirmado: ID ${device.ID}, archivo ${sacsExcelPath}, pestaña ${hoja}, fila ${result.row + 1}, ítem ${result.item}, solicitud ${requestId || 'legacy'}.`);
    res.json(responsePayload);
  } catch (error) {
    if (!workbookSaved) removeUploadedFiles(uploadedFiles);
    const responseError = normalizeSacsWriteError(error, workbookSaved);
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      console.log(
        'El archivo del informe SACS está bloqueado:',
        `ID ${deviceIdForLog || 'desconocido'}`,
        sacsExcelPath,
        error.code,
        `solicitud ${requestId || 'legacy'}`,
      );
    } else {
      console.error(
        'Error al procesar el registro SACS:',
        `ID ${deviceIdForLog || 'desconocido'}, solicitud ${requestId || 'legacy'}`,
        error,
      );
    }
    res.status(responseError.statusCode).json({ error: responseError.message });
  }
});

module.exports = router;
