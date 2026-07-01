import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import MatchNode from './MatchNode';

export default function BracketViewer({ 
  rounds, 
  hoveredId, 
  onHover, 
  onSelectWinner 
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const viewerRef = useRef(null);

  const matchHeight = 84; // Altura fija de cada tarjeta de partido (en px)
  const baseGap = 36;     // Brecha inicial entre partidos en la Ronda 0
  const connectorWidth = 50; // Ancho del conector SVG entre rondas
  const roundWidth = 240;    // Ancho de la columna de cada ronda

  // Fórmulas de espaciado matemático
  const getRoundSpacing = (roundIndex) => {
    const H = matchHeight;
    const G = baseGap;
    const paddingTop = (H + G) * (Math.pow(2, roundIndex) - 1) / 2;
    return { paddingTop };
  };

  // Evento de arrastre (Pan)
  const handleMouseDown = (e) => {
    // Solo arrastrar si se hace clic con el botón izquierdo y en el fondo del lienzo
    if (e.button !== 0) return;
    
    // Si se hizo clic en un botón o en el card, no arrastrar
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

  // Evento de zoom con rueda de mouse
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newZoom = Math.min(Math.max(zoom + direction * zoomFactor, 0.25), 2.5);
    setZoom(parseFloat(newZoom.toFixed(2)));
  };

  // Controles de zoom
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.25));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 50, y: 50 });
  };

  // Añadir listener pasivo para rueda (requerido para preventDefault en Chrome/Firefox)
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

  if (!rounds || rounds.length === 0) {
    return (
      <div className="empty-viewer">
        <Users size={48} className="empty-viewer-icon" />
        <h2>Sin torneo activo</h2>
        <p>Introduce participantes a la izquierda y pulsa "Aleatorizar y Crear Bracket".</p>
      </div>
    );
  }

  const dimensions = { matchHeight, baseGap, connectorWidth, roundWidth };

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
          display: 'flex',
          gap: `${connectorWidth}px`,
          paddingRight: '100px'
        }}
      >
        {rounds.map((round, rIdx) => {
          const { paddingTop } = getRoundSpacing(rIdx);
          
          return (
            <div 
              key={round.index} 
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
                <span className="round-subheader">{round.matches.length} partidos</span>
              </div>
              
              <div className="round-matches-list">
                {round.matches.map((match, mIdx) => (
                  <MatchNode
                    key={match.id}
                    match={match}
                    roundIndex={rIdx}
                    matchIndex={mIdx}
                    totalRounds={rounds.length}
                    hoveredId={hoveredId}
                    onHover={onHover}
                    onSelectWinner={onSelectWinner}
                    dimensions={dimensions}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
