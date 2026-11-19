const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = 'C:/Users/jmunozav/Johnson Controls/Giovanni Parra - Mantenimiento Sistemas/FADS/Informe_fads_automatizado/informe_fads_jci.xlsx';

const workbook = XLSX.readFile(excelPath);
const sheetName = 'DISPOSITIVOS';
const worksheet = workbook.Sheets[sheetName];

// 1. Obtener el rango real de la hoja (evita leer el millón de filas vacías)
const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:I10');

// 2. Encontrar la siguiente fila disponible buscando hacia abajo
let proximaFila = range.e.r + 1; // Fila siguiente al final actual

// 3. Crear el nuevo registro respetando tus columnas
const nuevaFila = [
    proximaFila - 2, // Consecutivo ITEM (ajustando cabeceras)
    'P2L01D001',     // ID del dispositivo
    'PANEL 1',       // Posición/Panel
    'BANO HOMBRES',  // Ubicación
    'HONEYWELL',     // Tecnología
    new Date().toISOString().slice(0, 10), // Fecha YYYY-MM-DD
    'ALFREDO MUÑOZ', // Técnico
    'BUENO',         // Estado final
    'Prueba limpia'  // Observación
];

// 4. Agregar los datos en la celda correspondiente sin destruir estilos ni rangos
const cellAddress = XLSX.utils.encode_cell({ r: proximaFila, c: 0 });
// Insertamos los valores celda por celda en la nueva fila
nuevaFila.forEach((val, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: proximaFila, c: colIdx });
    worksheet[cellRef] = { t: typeof val === 'number' ? 'n' : 's', v: val };
});

// Actualizar el rango total de la hoja para que Excel no se queje
range.e.r = proximaFila;
worksheet['!ref'] = XLSX.utils.encode_range(range);

// Guardar cambios
XLSX.writeFile(workbook, excelPath);
console.log(`✅ Fila ${proximaFila} agregada exitosamente de forma limpia.`);