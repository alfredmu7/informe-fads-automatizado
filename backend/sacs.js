const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const createReportWriteQueue = require('./report-write-queue');
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

  try {
    const {
      hoja,
      idDispositivo,
      itemDispositivo,
      tecnico,
      general,
      observacion,
    } = req.body;

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

    const photoUrl = (file) => (file
      ? `${publicBackendUrl}/api/sacs/fotos/${encodeURIComponent(path.basename(file.path))}`
      : '');
    const registration = {
      sheetName: hoja,
      device,
      date: new Date().toISOString().slice(0, 10),
      technician: String(tecnico || ''),
      general: String(general || ''),
      observation: String(observacion || ''),
      selectedItems,
      numericValues,
      photoLinks: {
        photoBefore: photoUrl(req.files?.fotoAntes?.[0]),
        photoAfter: photoUrl(req.files?.fotoDespues?.[0]),
      },
    };

    const { result } = await serializeSacsWrite(async () => {
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
      const worksheet = workbook.getWorksheet(hoja);
      if (!worksheet) {
        const error = new Error(`La pestaña ${hoja} no existe en el archivo SACS.`);
        error.statusCode = 400;
        throw error;
      }

      const result = await writeSacsReportRow(worksheet, registration);
      await workbook.xlsx.writeFile(sacsExcelPath);
      workbookSaved = true;

      const verificationWorkbook = new ExcelJS.Workbook();
      await verificationWorkbook.xlsx.readFile(sacsExcelPath);
      const verificationWorksheet = verificationWorkbook.getWorksheet(hoja);
      const verificationRow = verificationWorksheet?.getRow(result.row + 1);
      const expectedValues = {
        ...result.values,
        photoBefore: registration.photoLinks.photoBefore,
        photoAfter: registration.photoLinks.photoAfter,
      };
      const mismatch = findSacsReportRowMismatch(verificationRow, result.columns, expectedValues);
      if (mismatch) {
        throw new Error(`El Excel SACS se escribió, pero no se pudo verificar el campo ${mismatch[0]}.`);
      }
      return { result };
    });

    console.log(`Registro SACS confirmado: ${hoja}, fila ${result.row + 1}, ítem ${result.item}.`);
    res.json({
      success: true,
      inspectionSaved: true,
      hoja,
      fila: result.row + 1,
      item: result.item,
      dispositivo: device.ID,
      ubicacion: device.UBICACION || '',
      fotos: {
        antes: registration.photoLinks.photoBefore,
        despues: registration.photoLinks.photoAfter,
      },
    });
  } catch (error) {
    if (!workbookSaved) removeUploadedFiles(uploadedFiles);
    const responseError = normalizeSacsWriteError(error, workbookSaved);
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      console.log('El archivo del informe SACS está bloqueado:', error.code);
    } else {
      console.error('Error al procesar el registro SACS:', error);
    }
    res.status(responseError.statusCode).json({ error: responseError.message });
  }
});

module.exports = router;
