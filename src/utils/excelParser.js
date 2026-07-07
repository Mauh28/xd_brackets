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

/**
 * Exporta el torneo actual como un archivo de Excel (.xlsx) con los datos organizados.
 * @param {Object} tournament - Objeto del torneo activo.
 * @param {string} title - Título del torneo.
 */
export const exportExcelTournament = (tournament, title) => {
  if (!tournament) return;

  const rows = [];
  rows.push(["Torneo", title]);
  rows.push(["Tipo de Bracket", tournament.isDoubleElimination ? "Doble Eliminación" : "Eliminación Simple"]);
  rows.push(["Modalidad", tournament.is2v2 ? "2v2 (Equipos)" : "1v1 (Individual)"]);
  rows.push([]); // fila vacía

  rows.push(["Fase / Ronda", "Partido", "Participante 1", "Marcador 1", "Marcador 2", "Participante 2", "Ganador"]);

  const addRounds = (roundsList, bracketLabel) => {
    roundsList.forEach(round => {
      round.matches.forEach((match, index) => {
        rows.push([
          `${bracketLabel} - ${round.name}`,
          `M-${index + 1}`,
          match.p1 ? match.p1.name : "Esperando...",
          match.score1 !== null ? match.score1 : "-",
          match.score2 !== null ? match.score2 : "-",
          match.p2 ? match.p2.name : "Esperando...",
          match.winner ? match.winner.name : "Pendiente"
        ]);
      });
    });
  };

  addRounds(tournament.winnersRounds, "Cuadro de Ganadores");
  
  if (tournament.isDoubleElimination && tournament.losersRounds) {
    addRounds(tournament.losersRounds, "Cuadro de Perdedores");
    if (tournament.grandFinal) {
      const gf = tournament.grandFinal;
      rows.push([
        "Gran Final",
        "GF",
        gf.p1 ? gf.p1.name : "Esperando...",
        gf.score1 !== null ? gf.score1 : "-",
        gf.score2 !== null ? gf.score2 : "-",
        gf.p2 ? gf.p2.name : "Esperando...",
        gf.winner ? gf.winner.name : "Pendiente"
      ]);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  
  // Dar formato básico a columnas
  worksheet['!cols'] = [
    { wch: 30 }, // Fase / Ronda
    { wch: 10 }, // Partido
    { wch: 25 }, // Participante 1
    { wch: 12 }, // Marcador 1
    { wch: 12 }, // Marcador 2
    { wch: 25 }, // Participante 2
    { wch: 25 }  // Ganador
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");

  const safeFileName = title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'torneo';
  XLSX.writeFile(workbook, `${safeFileName}_resultados.xlsx`);
};

