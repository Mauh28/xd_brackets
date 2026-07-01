import React from 'react';
import { Award } from 'lucide-react';

export default function MatchNode({ 
  match, 
  roundIndex, 
  matchIndex, 
  totalRounds,
  roundType, // 'winners' | 'losers'
  isDoubleElimination,
  hoveredId, 
  onHover, 
  onSelectWinner,
  dimensions
}) {
  const { p1, p2, winner, id: matchId } = match;
  const { matchHeight, connectorWidth } = dimensions;

  const isWinners = roundType === 'winners' || roundType === undefined;
  const effectiveRoundIndex = isWinners ? roundIndex : Math.floor(roundIndex / 2);

  // Calcular las dimensiones del conector
  const G = dimensions.baseGap;
  const H = matchHeight;
  const gap = (H + G) * Math.pow(2, effectiveRoundIndex) - H;

  // Un conector es recto horizontal si:
  // 1. Es una ronda de perdedores par (0, 2, ...) donde avanza 1-a-1
  // 2. O si es el partido final (Winners Final o Losers Final) que avanza hacia la Gran Final
  const isStraightConnector = (!isWinners && roundIndex % 2 === 0) || 
    (isDoubleElimination && (
      (isWinners && roundIndex === totalRounds - 1) || 
      (!isWinners && roundIndex === totalRounds - 1)
    ));

  const connectorHeight = isStraightConnector ? 4 : (gap + H) / 2;
  const isEven = matchIndex % 2 === 0;

  // Determinar si una ranura de participante está resaltada
  const isP1Hovered = p1 && hoveredId && p1.id === hoveredId && !p1.isBye;
  const isP2Hovered = p2 && hoveredId && p2.id === hoveredId && !p2.isBye;

  // Determinar si la conexión de salida debe estar resaltada (el ganador avanza)
  const isConnectorHighlighted = winner && hoveredId && winner.id === hoveredId && !winner.isBye;

  // Manejo de hover
  const handleMouseEnter = (participant) => {
    if (participant && !participant.isBye) {
      onHover(participant.id);
    }
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  const handleWinnerClick = (participant) => {
    if (participant && !participant.isBye && !isByeMatch) {
      onSelectWinner(matchId, participant);
    }
  };

  const isByeMatch = (p1?.isBye || p2?.isBye);
  const isP1Winner = winner && p1 && winner.id === p1.id;
  const isP2Winner = winner && p2 && winner.id === p2.id;

  const isGrandFinal = match.isGrandFinal === true;
  
  // Dibujar conector para todos los partidos excepto la Gran Final
  const showConnector = !isGrandFinal && (
    isDoubleElimination 
      ? true 
      : (roundIndex < totalRounds - 1)
  );

  return (
    <div 
      className={`match-node-wrapper ${isGrandFinal ? 'grand-final-node' : ''}`}
      style={{ 
        height: `${H}px`,
        marginBottom: isGrandFinal ? '0px' : `${gap}px`,
        position: 'relative'
      }}
    >
      <div className={`match-card ${winner ? 'has-winner' : ''} ${isGrandFinal ? 'grand-final-card' : ''}`}>
        {isGrandFinal && (
          <div className="grand-final-badge">
            <Award size={10} style={{ marginRight: '3px' }} />
            GRAN FINAL
          </div>
        )}

        {/* Jugador 1 */}
        <div 
          className={`participant-slot ${p1 ? (p1.isBye ? 'bye-slot' : '') : 'empty-slot'} ${isP1Hovered ? 'path-highlight' : ''} ${isP1Winner ? 'winner-slot' : winner ? 'loser-slot' : ''}`}
          onMouseEnter={() => handleMouseEnter(p1)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleWinnerClick(p1)}
        >
          <span className="participant-name">
            {p1 ? p1.name : <span className="placeholder-text">Esperando...</span>}
          </span>
          {isP1Winner && <Award className="winner-icon" size={14} />}
        </div>

        <div className="match-divider"></div>

        {/* Jugador 2 */}
        <div 
          className={`participant-slot ${p2 ? (p2.isBye ? 'bye-slot' : '') : 'empty-slot'} ${isP2Hovered ? 'path-highlight' : ''} ${isP2Winner ? 'winner-slot' : winner ? 'loser-slot' : ''}`}
          onMouseEnter={() => handleMouseEnter(p2)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleWinnerClick(p2)}
        >
          <span className="participant-name">
            {p2 ? p2.name : <span className="placeholder-text">Esperando...</span>}
          </span>
          {isP2Winner && <Award className="winner-icon" size={14} />}
        </div>
      </div>

      {/* Conectores SVG entre rondas */}
      {showConnector && (
        <div 
          className="connector-svg-container"
          style={{
            position: 'absolute',
            width: `${connectorWidth}px`,
            height: `${connectorHeight}px`,
            right: `-${connectorWidth}px`,
            top: isStraightConnector 
              ? `${H / 2 - 2}px` 
              : (isEven ? `${H / 2}px` : `${H / 2 - connectorHeight}px`),
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <svg width="100%" height="100%">
            {isStraightConnector ? (
              // Línea recta horizontal
              <line 
                x1="0" 
                y1="2" 
                x2={connectorWidth} 
                y2="2"
                className={`connector-path ${isConnectorHighlighted ? 'active' : ''}`}
              />
            ) : isEven ? (
              // Conector que va hacia abajo
              <path 
                d={`M 0,1 
                    L ${connectorWidth / 2},1 
                    L ${connectorWidth / 2},${connectorHeight - 1} 
                    L ${connectorWidth},${connectorHeight - 1}`}
                className={`connector-path ${isConnectorHighlighted ? 'active' : ''}`}
                fill="none"
              />
            ) : (
              // Conector que va hacia arriba
              <path 
                d={`M 0,${connectorHeight - 1} 
                    L ${connectorWidth / 2},${connectorHeight - 1} 
                    L ${connectorWidth / 2},1 
                    L ${connectorWidth},1`}
                className={`connector-path ${isConnectorHighlighted ? 'active' : ''}`}
                fill="none"
              />
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
