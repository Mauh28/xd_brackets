import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move, Users, Trophy } from 'lucide-react';
import MatchNode from './MatchNode';

export default function BracketViewer({ 
  tournament, 
  hoveredId, 
  onHover, 
  onSelectWinner 
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const viewerRef = useRef(null);

  const matchHeight = 84;    // Altura fija de cada tarjeta de match
  const baseGap = 36;        // Brecha inicial entre matches en Ronda 0
  const connectorWidth = 50; // Ancho del conector SVG entre rondas
  const roundWidth = 240;    // Ancho de la columna de cada ronda

  // Fórmulas de espaciado matemático
  const getRoundSpacing = (roundIndex, roundType) => {
    const H = matchHeight;
    const G = baseGap;
    
    // Si es del cuadro de perdedores, la brecha vertical se duplica cada 2 rondas
    const effectiveIndex = roundType === 'losers' ? Math.floor(roundIndex / 2) : roundIndex;
    const paddingTop = (H + G) * (Math.pow(2, effectiveIndex) - 1) / 2;
    
    return { paddingTop };
  };

  // Evento de arrastre (Pan)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.match-card') || e.target.closest('.btn') || e.target.closest('.zoom-controls')) {
      return;
    }
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Evento de zoom con rueda
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newZoom = Math.min(Math.max(zoom + direction * zoomFactor, 0.2), 2.5);
    setZoom(parseFloat(newZoom.toFixed(2)));
  };

  // Controles de zoom
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.2));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 50, y: 50 });
  };

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const onWheelEvent = (e) => {
      if (e.target.closest('.bracket-canvas-container')) {
        handleWheel(e);
      }
    };

    viewer.addEventListener('wheel', onWheelEvent, { passive: false });
    return () => {
      viewer.removeEventListener('wheel', onWheelEvent);
    };
  }, [zoom]);

  if (!tournament || !tournament.winnersRounds || tournament.winnersRounds.length === 0) {
    return (
      <div className="empty-viewer">
        <Users size={48} className="empty-viewer-icon" />
        <h2>Sin torneo activo</h2>
        <p>Introduce participantes a la izquierda y pulsa "Aleatorizar y Crear Bracket".</p>
      </div>
    );
  }

  const { isDoubleElimination, winnersRounds, losersRounds, grandFinal } = tournament;
  const dimensions = { matchHeight, baseGap, connectorWidth, roundWidth };

  // Renderiza una columna de ronda
  const renderRoundColumn = (round, roundType, totalRoundCount) => {
    const { paddingTop } = getRoundSpacing(round.index, roundType);
    
    return (
      <div 
        key={`${roundType}-${round.index}`} 
        className="round-column"
        style={{
          width: `${roundWidth}px`,
          paddingTop: `${paddingTop}px`,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="round-header">
          <h4>{round.name}</h4>
          <span className="round-subheader">{round.matches.length} {round.matches.length === 1 ? 'match' : 'matches'}</span>
        </div>
        
        <div className="round-matches-list">
          {round.matches.map((match, mIdx) => (
            <MatchNode
              key={match.id}
              match={match}
              roundIndex={round.index}
              matchIndex={mIdx}
              totalRounds={totalRoundCount}
              roundType={roundType}
              isDoubleElimination={isDoubleElimination}
              hoveredId={hoveredId}
              onHover={onHover}
              onSelectWinner={onSelectWinner}
              dimensions={dimensions}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`bracket-viewer-container ${isDragging ? 'grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      ref={viewerRef}
    >
      {/* Controles flotantes */}
      <div className="zoom-controls">
        <button className="btn btn-secondary btn-icon-only" onClick={zoomIn} title="Acercar">
          <ZoomIn size={16} />
        </button>
        <button className="btn btn-secondary btn-icon-only" onClick={zoomOut} title="Alejar">
          <ZoomOut size={16} />
        </button>
        <button className="btn btn-secondary btn-icon-only" onClick={resetZoom} title="Centrar y Reiniciar Zoom">
          <Maximize2 size={16} />
        </button>
        <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
      </div>

      <div className="pan-indicator">
        <Move size={14} />
        <span>Mantén presionado y arrastra para mover</span>
      </div>

      {/* Lienzo del Bracket con Zoom y Desplazamiento */}
      <div 
        className="bracket-canvas-container"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          paddingRight: '100px'
        }}
      >
        {!isDoubleElimination ? (
          // Vista Estándar (Single Elimination)
          <div className="single-elim-layout" style={{ display: 'flex', gap: `${connectorWidth}px` }}>
            {winnersRounds.map((round) => renderRoundColumn(round, 'winners', winnersRounds.length))}
          </div>
        ) : (
          // Vista Doble Eliminación (Stacked Brackets)
          <div className="double-elim-layout" style={{ display: 'flex', gap: `${connectorWidth}px`, alignItems: 'center' }}>
            <div className="double-elim-brackets-stack" style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
              
              {/* Cuadro de Ganadores */}
              <div className="bracket-block-wrapper">
                <div className="bracket-block-title">
                  <Trophy size={14} style={{ color: 'var(--color-primary)' }} />
                  <span>CUADRO DE GANADORES</span>
                </div>
                <div className="bracket-row" style={{ display: 'flex', gap: `${connectorWidth}px` }}>
                  {winnersRounds.map((round) => renderRoundColumn(round, 'winners', winnersRounds.length))}
                </div>
              </div>

              {/* Cuadro de Perdedores */}
              <div className="bracket-block-wrapper">
                <div className="bracket-block-title">
                  <Trophy size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>CUADRO DE PERDEDORES</span>
                </div>
                <div className="bracket-row" style={{ display: 'flex', gap: `${connectorWidth}px` }}>
                  {losersRounds.map((round) => renderRoundColumn(round, 'losers', losersRounds.length))}
                </div>
              </div>

            </div>

            {/* Gran Final (Far Right) */}
            {grandFinal && (
              <div 
                className="grand-final-stage-wrapper" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignSelf: 'stretch',
                  paddingLeft: '20px'
                }}
              >
                <div 
                  className="round-column"
                  style={{
                    width: `${roundWidth}px`,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div className="round-header" style={{ borderBottomColor: 'var(--color-primary)' }}>
                    <h4 style={{ color: 'var(--color-primary)' }}>CAMPEONATO</h4>
                    <span className="round-subheader">Gran Final</span>
                  </div>
                  
                  <div className="round-matches-list">
                    <MatchNode
                      match={grandFinal}
                      roundIndex={0}
                      matchIndex={0}
                      totalRounds={1}
                      roundType="grandfinal"
                      isDoubleElimination={true}
                      hoveredId={hoveredId}
                      onHover={onHover}
                      onSelectWinner={onSelectWinner}
                      dimensions={dimensions}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
