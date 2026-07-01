/**
 * Representa la lógica de brackets para torneos de eliminación simple.
 */

// Genera un ID único para un participante
export const generateParticipantId = () => Math.random().toString(36).substr(2, 9);

/**
 * Genera la estructura de rondas inicial a partir de una lista de nombres.
 * @param {string[]} names - Lista de nombres de participantes.
 * @returns {Array} Listado de rondas con sus respectivos partidos.
 */
export const generateBracket = (names) => {
  if (!names || names.length === 0) return [];

  // 1. Crear objetos de participantes con IDs únicos
  const participants = names.map(name => ({
    id: generateParticipantId(),
    name: name.trim(),
    isBye: false
  }));

  const N = participants.length;
  // Si solo hay 1 participante, no hay torneo
  if (N <= 1) {
    return [{
      index: 0,
      name: "Final",
      matches: [{
        id: "0-0",
        p1: participants[0],
        p2: { id: "bye", name: "BYE", isBye: true },
        score1: null,
        score2: null,
        winner: participants[0]
      }]
    }];
  }

  // 2. Determinar la potencia de 2 más cercana (hacia arriba)
  const R = Math.ceil(Math.log2(N)); // Número de rondas
  const totalSlots = Math.pow(2, R);

  // 3. Rellenar con BYEs hasta completar la potencia de 2
  const paddedParticipants = [...participants];
  while (paddedParticipants.length < totalSlots) {
    paddedParticipants.push({
      id: `bye-${generateParticipantId()}`,
      name: "BYE",
      isBye: true
    });
  }

  // 4. Inicializar todas las rondas vacías
  const rounds = [];
  for (let r = 0; r < R; r++) {
    const matchCount = Math.pow(2, R - r - 1);
    const matches = [];
    for (let m = 0; m < matchCount; m++) {
      matches.push({
        id: `${r}-${m}`,
        p1: null,
        p2: null,
        score1: null,
        score2: null,
        winner: null
      });
    }
    rounds.push({
      index: r,
      name: r === R - 1 ? "Final" : r === R - 2 ? "Semifinal" : `Ronda ${r + 1}`,
      matches
    });
  }

  // 5. Rellenar la primera ronda (Round 0)
  const round0Matches = rounds[0].matches;
  for (let m = 0; m < round0Matches.length; m++) {
    const match = round0Matches[m];
    match.p1 = paddedParticipants[2 * m];
    match.p2 = paddedParticipants[2 * m + 1];

    // Auto-avanzar si uno es BYE
    if (match.p1.isBye && match.p2.isBye) {
      match.winner = null;
    } else if (match.p1.isBye) {
      match.winner = match.p2;
    } else if (match.p2.isBye) {
      match.winner = match.p1;
    }
  }

  // 6. Propagar los ganadores automáticos de la primera ronda en adelante
  propagateWinners(rounds);

  return rounds;
};

/**
 * Propaga los ganadores a las rondas siguientes según el estado actual de los partidos.
 * @param {Array} rounds - Estructura de rondas.
 */
export const propagateWinners = (rounds) => {
  const R = rounds.length;

  for (let r = 0; r < R - 1; r++) {
    const currentRoundMatches = rounds[r].matches;
    const nextRoundMatches = rounds[r + 1].matches;

    for (let m = 0; m < currentRoundMatches.length; m++) {
      const match = currentRoundMatches[m];
      const nextMatchIndex = Math.floor(m / 2);
      const nextMatch = nextRoundMatches[nextMatchIndex];

      if (!nextMatch) continue;

      const isP1Slot = m % 2 === 0;

      // Colocar el ganador del partido actual en la ranura correspondiente
      if (isP1Slot) {
        nextMatch.p1 = match.winner;
      } else {
        nextMatch.p2 = match.winner;
      }

      // Auto-avanzar el siguiente partido si se detecta un BYE en la otra ranura
      if (nextMatch.p1 && nextMatch.p2) {
        if (nextMatch.p1.isBye && nextMatch.p2.isBye) {
          nextMatch.winner = null;
        } else if (nextMatch.p1.isBye) {
          nextMatch.winner = nextMatch.p2;
        } else if (nextMatch.p2.isBye) {
          nextMatch.winner = nextMatch.p1;
        }
      }
    }
  }
};

/**
 * Avanza un jugador en un partido específico estableciéndolo como ganador.
 * @param {Array} rounds - Estructura de rondas.
 * @param {string} matchId - ID del partido (ej. "r-m").
 * @param {Object} winner - Objeto del participante ganador.
 * @returns {Array} Nuevas rondas con el estado actualizado.
 */
export const setMatchWinner = (rounds, matchId, winner) => {
  const [rIndex, mIndex] = matchId.split("-").map(Number);
  const updatedRounds = JSON.parse(JSON.stringify(rounds)); // Copia profunda

  const match = updatedRounds[rIndex].matches[mIndex];
  if (!match) return rounds;

  // Si el partido contiene un BYE en alguna ranura o es vacío, no hace nada
  if (match.p1?.isBye && match.p2?.isBye) return rounds;

  // Si el ganador seleccionado es el que ya estaba, no hace nada
  if (match.winner && match.winner.id === winner?.id) return updatedRounds;

  match.winner = winner;

  // Al cambiar el ganador de un partido, debemos "limpiar" los descendientes
  // del anterior ganador en las rondas siguientes para evitar inconsistencias.
  clearFutureWins(updatedRounds, rIndex, mIndex);

  // Propagar los cambios
  propagateWinners(updatedRounds);

  return updatedRounds;
};

/**
 * Limpia de forma recursiva los ganadores/participantes de las rondas futuras
 * cuando se cambia el ganador de un partido.
 */
const clearFutureWins = (rounds, rIndex, mIndex) => {
  const nextR = rIndex + 1;
  if (nextR >= rounds.length) return;

  const nextM = Math.floor(mIndex / 2);
  const nextMatch = rounds[nextR].matches[nextM];

  if (!nextMatch) return;

  const isP1Slot = mIndex % 2 === 0;

  // Si el participante que va a ser sobrescrito era el ganador del siguiente partido,
  // limpiamos su ganador y limpiamos recursivamente la siguiente ronda.
  const oldParticipant = isP1Slot ? nextMatch.p1 : nextMatch.p2;

  if (oldParticipant && nextMatch.winner && nextMatch.winner.id === oldParticipant.id) {
    nextMatch.winner = null;
    clearFutureWins(rounds, nextR, nextM);
  }

  if (isP1Slot) {
    nextMatch.p1 = null;
  } else {
    nextMatch.p2 = null;
  }
};
