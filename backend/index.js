const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { buildPhotoFilename, findDeviceById, writeReportRow } = require('./report');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const PUBLIC_BACKEND_URL = new URL(
  process.env.PUBLIC_BACKEND_URL || 'https://bimanual-alisa-unsuperfluous.ngrok-free.dev'
).origin;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning'],
}));
app.use(express.json());

// Carpeta de destino directamente en OneDrive para almacenar las evidencias fotográficas
const onedriveImagesDir = 'C:/Users/jmunozav/Johnson Controls/Giovanni Parra - Mantenimiento Sistemas/FADS/Informe_fads_automatizado/fotos_fads';
if (!fs.existsSync(onedriveImagesDir)) {
  fs.mkdirSync(onedriveImagesDir, { recursive: true });
}
const databasePath = path.join(__dirname, 'public', 'SQL_fads_oficial_backend.json');
const excelPath = 'C:/Users/jmunozav/Johnson Controls/Giovanni Parra - Mantenimiento Sistemas/FADS/Informe_fads_automatizado/informe_fads_jci.xlsx';
const excelLockPath = path.join(path.dirname(excelPath), `~$${path.basename(excelPath)}`);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, onedriveImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    const deviceId = req.body?.idDispositivo;
    const filename = buildPhotoFilename(file.fieldname, deviceId, extension);
    const uniqueFilename = fs.existsSync(path.join(onedriveImagesDir, filename))
      ? buildPhotoFilename(file.fieldname, deviceId, extension, uniqueSuffix)
      : filename;
    cb(null, uniqueFilename);
  },
});
const upload = multer({ storage });

const cpUpload = upload.fields([
  { name: 'fotoAntes', maxCount: 1 },
  { name: 'fotoDespues', maxCount: 1 },
]);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    publicBackendUrl: PUBLIC_BACKEND_URL,
    excelExists: fs.existsSync(excelPath),
    excelLocked: fs.existsSync(excelLockPath),
  });
});

app.get('/fotos/:filename', (req, res, next) => {
  const { filename } = req.params;
  if (!/^[A-Z0-9_-]+\.jpe?g$/i.test(filename)) {
    return res.status(400).json({ error: 'Nombre de foto no válido.' });
  }

  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(onedriveImagesDir, filename), (error) => {
    if (!error) return;
    if (res.headersSent) return next(error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'No se encontró la foto.' });
    }
    return next(error);
  });
});

const removeUploadedFiles = (files) => {
  files.forEach((file) => {
    try {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (unlinkError) {
      console.warn(`No se pudo eliminar el archivo temporal ${file?.path}:`, unlinkError.message);
    }
  });
};

const ensurePhotoFilename = (file, deviceId) => {
  const extension = path.extname(file.originalname);
  const filename = buildPhotoFilename(file.fieldname, deviceId, extension);
  if (path.basename(file.path) === filename) return file;

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  const targetFilename = fs.existsSync(path.join(onedriveImagesDir, filename))
    ? buildPhotoFilename(file.fieldname, deviceId, extension, uniqueSuffix)
    : filename;
  const targetPath = path.join(onedriveImagesDir, targetFilename);
  fs.renameSync(file.path, targetPath);
  file.path = targetPath;
  file.filename = targetFilename;
  return file;
};

app.post('/api/registrar', cpUpload, async (req, res) => {
  const uploadedFiles = Object.values(req.files || {}).flat();
  let workbookSaved = false;

  try {
    const {
      idDispositivo,
      tecnico,
      estado,
      observacion,
      tipoEquipo,
      otroTipo,
      checklistItems: rawChecklistItems,
    } = req.body;

    if (!idDispositivo) {
      removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ error: 'El ID del dispositivo es obligatorio.' });
    }

    const devices = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    if (!Array.isArray(devices)) {
      throw new Error('La base de datos de dispositivos no contiene una lista válida.');
    }

    const device = findDeviceById(devices, idDispositivo);
    if (!device) {
      removeUploadedFiles(uploadedFiles);
      return res.status(404).json({ error: `El dispositivo ${idDispositivo} no existe en la base de datos.` });
    }

    if (!fs.existsSync(excelPath)) {
      removeUploadedFiles(uploadedFiles);
      return res.status(404).json({ error: `No se encontró el archivo Excel en la ruta: ${excelPath}` });
    }

    if (fs.existsSync(excelLockPath)) {
      removeUploadedFiles(uploadedFiles);
      return res.status(409).json({
        error: 'El informe está abierto en Excel. Ciérrelo para evitar que OneDrive sobrescriba el registro e intente de nuevo.',
      });
    }

    let selectedChecklistItems;
    try {
      selectedChecklistItems = JSON.parse(rawChecklistItems || '[]');
    } catch {
      throw new Error('Datos de inspección inválidos: no se pudo leer la lista de casillas.');
    }

    req.files?.fotoAntes?.forEach((file) => ensurePhotoFilename(file, device.ID));
    req.files?.fotoDespues?.forEach((file) => ensurePhotoFilename(file, device.ID));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const sheetName = 'DISPOSITIVOS';
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
      removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ error: `La hoja ${sheetName} no existe en el archivo.` });
    }

    const fotoAntesFile = req.files?.fotoAntes?.[0] || null;
    const fotoDespuesFile = req.files?.fotoDespues?.[0] || null;
    const photoUrl = (file) => (file
      ? `${PUBLIC_BACKEND_URL}/fotos/${encodeURIComponent(path.basename(file.path))}`
      : '');

    const result = await writeReportRow(worksheet, {
      device,
      date: new Date().toISOString().slice(0, 10),
      technician: tecnico || '',
      state: estado || 'BUENO',
      observation: observacion || '',
      inspection: {
        type: tipoEquipo,
        otherType: otroTipo,
        selectedItems: selectedChecklistItems,
      },
      photoLinks: {
        photoBefore: photoUrl(fotoAntesFile),
        photoAfter: photoUrl(fotoDespuesFile),
      },
    });

    await workbook.xlsx.writeFile(excelPath);
    workbookSaved = true;

    const verificationWorkbook = new ExcelJS.Workbook();
    await verificationWorkbook.xlsx.readFile(excelPath);
    const verificationWorksheet = verificationWorkbook.getWorksheet(sheetName);
    const verificationRow = verificationWorksheet?.getRow(result.row + 1);
    const valuesToVerify = {
      id: device.ID,
      ...result.inspectionValues,
    };
    const mismatch = Object.entries(valuesToVerify).find(([field, expected]) => {
      const actual = verificationRow?.getCell(result.columns[field]).value;
      return String(actual ?? '') !== String(expected ?? '');
    });

    if (mismatch) {
      throw new Error('El archivo Excel se escribió, pero no se pudo verificar el contenido del registro.');
    }

    console.log(
      `Registro confirmado: ${path.basename(excelPath)}, ${sheetName}, fila ${result.row + 1}, ítem ${result.item}.`,
    );

    res.json({
      success: true,
      inspectionSaved: true,
      message: 'Dispositivo registrado con ubicación y tecnología consultadas en la base de datos.',
      item: result.item,
      fila: result.row + 1,
      dispositivo: device.ID,
      dTivo: device.DISPOSITIVO || '',
      ubicacion: device.UBICACION || '',
      tecnologia: device.TIPO || '',
      fotos: { antes: photoUrl(fotoAntesFile), despues: photoUrl(fotoDespuesFile) },
    });
  } catch (error) {
    if (!workbookSaved) removeUploadedFiles(uploadedFiles);
    console.error('Error al procesar el registro:', error);
    const isClientError = error.message.startsWith('La hoja no tiene estas columnas requeridas:')
      || error.message.startsWith('Datos de inspección inválidos:');
    res.status(isClientError ? 400 : 500).json({
      error: error.message || 'Error interno del servidor al actualizar el Excel.',
    });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  console.error('Error al recibir la solicitud:', error);
  const status = error instanceof multer.MulterError ? 400 : 500;
  res.status(status).json({ error: error.message || 'No se pudo recibir el registro y sus fotos.' });
});

const server = app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
  console.log(`Túnel público activo en: ${PUBLIC_BACKEND_URL}/api/registrar`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: El puerto ${PORT} ya está en uso. Cierra el proceso anterior antes de iniciar.`);
  } else {
    console.error('Error en el servidor HTTP:', err);
  }
  process.exit(1);
});