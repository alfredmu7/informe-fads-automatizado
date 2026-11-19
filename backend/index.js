const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { buildPhotoFilename, findDeviceById, writeReportRow } = require('./report');

const app = express();
const PORT = 5000;

const PUBLIC_BACKEND_URL = new URL(
    process.env.PUBLIC_BACKEND_URL || 'https://bimanual-alisa-unsuperfluous.ngrok-free.dev/api/registrar'
).origin;

app.use(cors());
app.use(express.json());

// Carpeta de destino directamente en OneDrive para almacenar las evidencias fotográficas
const onedriveImagesDir = 'C:/Users/jmunozav/Johnson Controls/Giovanni Parra - Mantenimiento Sistemas/FADS/Informe_fads_automatizado/fotos_fads';
if (!fs.existsSync(onedriveImagesDir)) {
    fs.mkdirSync(onedriveImagesDir, { recursive: true });
}
const databasePath = path.join(__dirname, 'public', 'SQL_fads_oficial_backend.json');
const excelPath = 'C:/Users/jmunozav/Johnson Controls/Giovanni Parra - Mantenimiento Sistemas/FADS/Informe_fads_automatizado/informe_fads_jci.xlsx';
const excelLockPath = path.join(path.dirname(excelPath), `~$${path.basename(excelPath)}`);

// Configuración de Multer para almacenar las imágenes directamente en OneDrive
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, onedriveImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const deviceId = req.body?.idDispositivo;
        const filename = buildPhotoFilename(file.fieldname, deviceId, extension);
        const uniqueFilename = fs.existsSync(path.join(onedriveImagesDir, filename))
            ? buildPhotoFilename(file.fieldname, deviceId, extension, uniqueSuffix)
            : filename;
        cb(null, uniqueFilename);
    }
});
const upload = multer({ storage: storage });

// Configuración para recibir múltiples campos de imagen ('fotoAntes' y 'fotoDespues')
const cpUpload = upload.fields([
    { name: 'fotoAntes', maxCount: 1 },
    { name: 'fotoDespues', maxCount: 1 }
]);

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
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
};

const ensurePhotoFilename = (file, deviceId) => {
    const extension = path.extname(file.originalname);
    const filename = buildPhotoFilename(file.fieldname, deviceId, extension);
    if (path.basename(file.path) === filename) return file;

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const targetFilename = fs.existsSync(path.join(onedriveImagesDir, filename))
        ? buildPhotoFilename(file.fieldname, deviceId, extension, uniqueSuffix)
        : filename;
    const targetPath = path.join(onedriveImagesDir, targetFilename);
    fs.renameSync(file.path, targetPath);
    file.path = targetPath;
    file.filename = targetFilename;
    return file;
};

// RUTA CLAVE: Recibe el ID, busca ubicación/tecnología y genera hipervínculos en OneDrive
app.post('/api/registrar', cpUpload, (req, res) => {
    const uploadedFiles = Object.values(req.files || {}).flat();

    try {
        const { idDispositivo, tecnico, estado, observacion, tipoHoja } = req.body;

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

        req.files?.fotoAntes?.forEach((file) => ensurePhotoFilename(file, device.ID));
        req.files?.fotoDespues?.forEach((file) => ensurePhotoFilename(file, device.ID));

        const workbook = XLSX.readFile(excelPath);
        const sheetName = tipoHoja === 'CONFINADOS' ? 'DISPOSITIVOS CONFINADOS' : 'DISPOSITIVOS';
        
        if (!workbook.Sheets[sheetName]) {
            removeUploadedFiles(uploadedFiles);
            return res.status(400).json({ error: `La hoja ${sheetName} no existe en el archivo.` });
        }

        const worksheet = workbook.Sheets[sheetName];
        const fotoAntesFile = req.files?.fotoAntes?.[0] || null;
        const fotoDespuesFile = req.files?.fotoDespues?.[0] || null;
        const photoUrl = (file) => file
            ? `${PUBLIC_BACKEND_URL}/fotos/${encodeURIComponent(path.basename(file.path))}`
            : '';

        const result = writeReportRow(worksheet, {
            device,
            date: new Date().toISOString().slice(0, 10),
            technician: tecnico || '',
            state: estado || 'BUENO',
            observation: observacion || '',
            photoLinks: {
                photoBefore: photoUrl(fotoAntesFile),
                photoAfter: photoUrl(fotoDespuesFile),
            },
        });

        XLSX.writeFile(workbook, excelPath);

        res.json({
            success: true,
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
        removeUploadedFiles(uploadedFiles);
        console.error('Error al procesar el registro:', error);
        res.status(error.message.startsWith('La hoja no tiene estas columnas requeridas:')
            ? 400
            : 500).json({ error: error.message || 'Error interno del servidor al actualizar el Excel.' });
    }
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    console.error('Error al recibir la solicitud:', error);
    const status = error instanceof multer.MulterError ? 400 : 500;
    res.status(status).json({ error: error.message || 'No se pudo recibir el registro y sus fotos.' });
});

app.listen(PORT, () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
    console.log(`Túnel público activo en: ${PUBLIC_BACKEND_URL}/api/registrar`);
});