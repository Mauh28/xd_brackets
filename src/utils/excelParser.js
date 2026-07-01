import * as XLSX from 'xlsx';

/**
 * Lee un archivo Excel (.xlsx) y extrae los nombres de los participantes de la primera columna.
 * @param {File} file - Archivo cargado desde un input de tipo file.
 * @returns {Promise<string[]>} Promesa que resuelve a un listado de nombres de participantes.
 */
export const parseExcelParticipants = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Tomar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON como matriz bidimensional (filas y columnas)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Extraer los participantes de la primera columna
        const participants = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[0] !== undefined) {
            const name = String(row[0]).trim();
            // Ignorar celdas vacías o encabezados comunes de columna
            const lowerName = name.toLowerCase();
            const isHeader = ['participantes', 'nombres', 'nombre', 'jugadores', 'players', 'player', 'name', 'names', 'lista'].includes(lowerName);
            
            if (name && !isHeader) {
              participants.push(name);
            }
          }
        }
        
        resolve(participants);
      } catch (error) {
        reject(new Error("No se pudo procesar el archivo Excel. Asegúrate de que el formato sea válido."));
      }
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
};
