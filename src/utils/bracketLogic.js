/**
 * Representa la lógica de brackets para torneos de videojuegos (eSports).
 * Soporta Eliminación Simple y Doble Eliminación.
 */

// Genera un ID único para un participante
export const generateParticipantId = () => Math.random().toString(36).substr(2, 9);

/**
 * Genera la estructura de rondas inicial a partir de una lista de nombres.
 * Soporta simple y doble eliminación.
 * @param {string[]} names - Lista de nombres de participantes.
 * @param {boolean} isDoubleElimination - Indica si se incluye bracket de perdedores.
 * @returns {Object} Objeto con la estructura completa del torneo.
 */
export const generateTournament = (names, isDoubleElimination = false, is2v2 = false) => {
  if (!names || names.length === 0) {
    return {
      is2v2,
      isDoubleElimination,
      winnersRounds: [],
      losersRounds: [],
      grandFinal: null
    };
  }

  // 1. Crear objetos de participantes con IDs únicos
  const participants = names.map(name => ({
    id: generateParticipantId(),
    name: name.trim(),
    isBye: false
  }));

  const N = participants.length;
  const R = Math.ceil(Math.log2(N <= 1 ? 2 : N)); // Número de rondas
  const totalSlots = Math.pow(2, R);

  // Rellenar con BYEs hasta completar la potencia de 2
  const paddedParticipants = [...participants];
  while (paddedParticipants.length < totalSlots) {
    paddedParticipants.push({
      id: `bye-${generateParticipantId()}`,
      name: "BYE",
      isBye: true
    });
  }

  // 2. Inicializar Cuadro de Ganadores (Winners Bracket)
  const winnersRounds = [];
  for (let r = 0; r < R; r++) {
    const matchCount = Math.pow(2, R - r - 1);
    const matches = [];
    for (let m = 0; m < matchCount; m++) {
      matches.push({
        id: `w-${r}-${m}`,
        p1: null,
        p2: null,
        score1: null,
        score2: null,
        winner: null
      });
    }
    winnersRounds.push({
      index: r,
      name: r === R - 1 ? "Final Ganadores" : r === R - 2 ? "Semifinal Ganadores" : `Ronda ${r + 1} Ganadores`,
      matches
    });
  }

  // Rellenar la primera ronda de ganadores
  const round0Matches = winnersRounds[0].matches;
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

  // 3. Inicializar Cuadro de Perdedores (Losers Bracket) si corresponde
  const losersRounds = [];
  let grandFinal = null;

  if (isDoubleElimination && R >= 2) {
    const totalLbRounds = 2 * R - 2;
    for (let k = 0; k < totalLbRounds; k++) {
      const matchCount = Math.pow(2, R - 2 - Math.floor(k / 2));
      const matches = [];
      for (let m = 0; m < matchCount; m++) {
        matches.push({
          id: `l-${k}-${m}`,
          p1: null,
          p2: null,
          score1: null,
          score2: null,
          winner: null
        });
      }
      
      let roundName = `Ronda ${k + 1} Perdedores`;
      if (k === totalLbRounds - 1) {
        roundName = "Final Perdedores";
      } else if (k === totalLbRounds - 2) {
        roundName = "Semifinal Perdedores";
      }

      losersRounds.push({
        index: k,
        name: roundName,
        matches
      });
    }

    // Inicializar Gran Final
    grandFinal = {
      id: "gf-0",
      p1: null, // Viene de Ganadores
      p2: null, // Viene de Perdedores
      score1: null,
      score2: null,
      winner: null,
      isGrandFinal: true
    };
  }

  // 4. Propagar ganadores iniciales
  propagateTournamentWinners(winnersRounds, losersRounds, grandFinal, isDoubleElimination);

  return {
    is2v2,
    isDoubleElimination,
    winnersRounds,
    losersRounds,
    grandFinal
  };
};

/**
 * Devuelve el perdedor de un match si existe ganador.
 */
export const getMatchLoser = (match) => {
  if (!match.winner) return null;
  if (match.p1?.id === match.winner.id) return match.p2;
  if (match.p2?.id === match.winner.id) return match.p1;
  return null;
};

/**
 * Propaga ganadores tanto en eliminación simple como doble eliminación.
 */
export const propagateTournamentWinners = (winnersRounds, losersRounds, grandFinal, isDoubleElimination) => {
  const R = winnersRounds.length;
  if (R === 0) return;

  // 1. Propagar dentro del Cuadro de Ganadores
  for (let r = 0; r < R - 1; r++) {
    const currentMatches = winnersRounds[r].matches;
    const nextMatches = winnersRounds[r + 1].matches;

    for (let m = 0; m < currentMatches.length; m++) {
      const match = currentMatches[m];
      const nextMatchIdx = Math.floor(m / 2);
      const nextMatch = nextMatches[nextMatchIdx];

      if (!nextMatch) continue;

      const isP1Slot = m % 2 === 0;

      if (isP1Slot) {
        nextMatch.p1 = match.winner;
      } else {
        nextMatch.p2 = match.winner;
      }

      // Auto-avanzar si hay BYE en la otra ranura
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

  // 2. Propagar al Cuadro de Perdedores y Gran Final
  if (isDoubleElimination && losersRounds && losersRounds.length > 0) {
    const totalLbRounds = losersRounds.length;

    // A. Llenar perdedores de WB Ronda 0 en LB Ronda 0
    const wbRound0 = winnersRounds[0];
    const lbRound0 = losersRounds[0];
    if (wbRound0 && lbRound0) {
      wbRound0.matches.forEach((match, m) => {
        const loser = getMatchLoser(match);
        const targetMatchIdx = Math.floor(m / 2);
        const targetMatch = lbRound0.matches[targetMatchIdx];
        if (targetMatch) {
          if (m % 2 === 0) {
            targetMatch.p1 = loser;
          } else {
            targetMatch.p2 = loser;
          }
        }
      });
    }

    // B. Propagar consecutivamente a través de las rondas del Cuadro de Perdedores
    for (let k = 0; k < totalLbRounds; k++) {
      const currentRound = losersRounds[k];

      // Auto-avanzar enfrentamientos de esta ronda si contienen BYEs
      currentRound.matches.forEach(match => {
        if (match.p1 && match.p2) {
          if (match.p1.isBye && match.p2.isBye) {
            match.winner = null;
          } else if (match.p1.isBye) {
            match.winner = match.p2;
          } else if (match.p2.isBye) {
            match.winner = match.p1;
          }
        }
      });

      const nextRound = losersRounds[k + 1];
      if (!nextRound) continue;

      const isEven = k % 2 === 0;

      if (isEven) {
        // Rondas pares de LB: avanzan 1-a-1 a la ranura p1 de la ronda impar siguiente
        currentRound.matches.forEach((match, m) => {
          const targetMatch = nextRound.matches[m];
          if (targetMatch) {
            targetMatch.p1 = match.winner;
          }
        });

        // La ranura p2 de la ronda impar siguiente se rellena con los perdedores de WB Ronda (k/2 + 1)
        const wbSourceRoundIdx = Math.floor(k / 2) + 1;
        const wbSourceRound = winnersRounds[wbSourceRoundIdx];
        if (wbSourceRound) {
          wbSourceRound.matches.forEach((match, m) => {
            const loser = getMatchLoser(match);
            const targetMatch = nextRound.matches[m];
            if (targetMatch) {
              targetMatch.p2 = loser;
            }
          });
        }
      } else {
        // Rondas impares de LB: reducen 2-a-1 a la ronda par siguiente
        currentRound.matches.forEach((match, m) => {
          const targetMatchIdx = Math.floor(m / 2);
          const targetMatch = nextRound.matches[targetMatchIdx];
          if (targetMatch) {
            if (m % 2 === 0) {
              targetMatch.p1 = match.winner;
            } else {
              targetMatch.p2 = match.winner;
            }
          }
        });
      }
    }

    // C. Conectar ganadores a la Gran Final
    if (grandFinal) {
      const wbFinalMatch = winnersRounds[R - 1]?.matches[0];
      const lbFinalMatch = losersRounds[totalLbRounds - 1]?.matches[0];

      grandFinal.p1 = wbFinalMatch?.winner || null;
      grandFinal.p2 = lbFinalMatch?.winner || null;

      // Auto-avanzar Gran Final si hay BYE
      if (grandFinal.p1 && grandFinal.p2) {
        if (grandFinal.p1.isBye) {
          grandFinal.winner = grandFinal.p2;
        } else if (grandFinal.p2.isBye) {
          grandFinal.winner = grandFinal.p1;
        }
      }
    }
  }
};

/**
 * Avanza un jugador en un partido específico, actualizando todo el torneo de forma reactiva.
 */
export const updateTournamentMatchWinner = (tournament, matchId, winner) => {
  const updated = JSON.parse(JSON.stringify(tournament)); // Clonación profunda
  const isWinners = matchId.startsWith('w-');
  const isLosers = matchId.startsWith('l-');
  const isGrandFinal = matchId.startsWith('gf-');

  let matchFound = null;

  if (isWinners) {
    const [, rIdx, mIdx] = matchId.split('-').map(Number);
    matchFound = updated.winnersRounds[rIdx]?.matches[mIdx];
    if (matchFound) {
      matchFound.winner = winner;
      clearFutureWinners(updated.winnersRounds, rIdx, mIdx);
      
      // Si es doble eliminación, al cambiar el ganador de WB, el oponente derrotado
      // cambia en la ruta de perdedores. Debemos limpiar su progreso en LB.
      if (updated.isDoubleElimination) {
        clearLoserPathFromWb(updated, rIdx, mIdx);
      }
    }
  } else if (isLosers) {
    const [, rIdx, mIdx] = matchId.split('-').map(Number);
    matchFound = updated.losersRounds[rIdx]?.matches[mIdx];
    if (matchFound) {
      matchFound.winner = winner;
      clearFutureLosers(updated.losersRounds, rIdx, mIdx);
    }
  } else if (isGrandFinal) {
    matchFound = updated.grandFinal;
    if (matchFound) {
      matchFound.winner = winner;
    }
  }

  // Re-propagar todo el torneo para recalcular posiciones
  propagateTournamentWinners(
    updated.winnersRounds, 
    updated.losersRounds, 
    updated.grandFinal, 
    updated.isDoubleElimination
  );

  return updated;
};

/**
 * Limpia recursivamente los ganadores futuros en el cuadro de ganadores.
 */
const clearFutureWinners = (rounds, rIndex, mIndex) => {
  const nextR = rIndex + 1;
  if (nextR >= rounds.length) return;

  const nextM = Math.floor(mIndex / 2);
  const nextMatch = rounds[nextR].matches[nextM];
  if (!nextMatch) return;

  const isP1 = mIndex % 2 === 0;
  const oldPlayer = isP1 ? nextMatch.p1 : nextMatch.p2;

  if (oldPlayer && nextMatch.winner && nextMatch.winner.id === oldPlayer.id) {
    nextMatch.winner = null;
    clearFutureWinners(rounds, nextR, nextM);
  }
};

/**
 * Limpia recursivamente los ganadores futuros en el cuadro de perdedores.
 */
const clearFutureLosers = (rounds, rIndex, mIndex) => {
  const nextR = rIndex + 1;
  if (nextR >= rounds.length) return;

  const isEven = rIndex % 2 === 0;
  
  if (isEven) {
    // 1-a-1
    const nextMatch = rounds[nextR].matches[mIndex];
    if (nextMatch && nextMatch.winner && nextMatch.p1 && nextMatch.winner.id === nextMatch.p1.id) {
      nextMatch.winner = null;
      clearFutureLosers(rounds, nextR, mIndex);
    }
  } else {
    // 2-a-1
    const nextM = Math.floor(mIndex / 2);
    const nextMatch = rounds[nextR].matches[nextM];
    if (!nextMatch) return;

    const isP1 = mIndex % 2 === 0;
    const oldPlayer = isP1 ? nextMatch.p1 : nextMatch.p2;

    if (oldPlayer && nextMatch.winner && nextMatch.winner.id === oldPlayer.id) {
      nextMatch.winner = null;
      clearFutureLosers(rounds, nextR, nextM);
    }
  }
};

/**
 * Al modificar el ganador de un partido de ganadores, el perdedor que se envía a la bracket de perdedores cambia.
 * Debemos limpiar el progreso de ese perdedor modificado en la bracket de perdedores.
 */
const clearLoserPathFromWb = (tournament, wbRoundIdx, wbMatchIdx) => {
  const { losersRounds } = tournament;
  if (!losersRounds || losersRounds.length === 0) return;

  let targetLbRoundIdx = 0;
  let targetLbMatchIdx = 0;
  let slotKey = 'p1';

  if (wbRoundIdx === 0) {
    targetLbRoundIdx = 0;
    targetLbMatchIdx = Math.floor(wbMatchIdx / 2);
    slotKey = wbMatchIdx % 2 === 0 ? 'p1' : 'p2';
  } else {
    // wbRoundIdx > 0
    const R = tournament.winnersRounds.length;
    if (wbRoundIdx === R - 1) {
      // Final ganadores
      targetLbRoundIdx = losersRounds.length - 1; // Final perdedores
      targetLbMatchIdx = 0;
      slotKey = 'p2';
    } else {
      targetLbRoundIdx = 2 * wbRoundIdx - 1;
      targetLbMatchIdx = wbMatchIdx;
      slotKey = 'p2';
    }
  }

  const targetMatch = losersRounds[targetLbRoundIdx]?.matches[targetLbMatchIdx];
  if (!targetMatch) return;

  // Limpiar ganador si existía y limpiar recursivamente sus descendientes
  if (targetMatch.winner) {
    targetMatch.winner = null;
    clearFutureLosers(losersRounds, targetLbRoundIdx, targetLbMatchIdx);
  }
};
