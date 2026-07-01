import React, { useState, useEffect, useRef } from 'react';
import { Shuffle, Zap, Trophy, FastForward, UserCheck } from 'lucide-react';

export default function ShuffleOverlay({ names, onComplete, onClose }) {
  const [remainingPlayers, setRemainingPlayers] = useState([...names]);
  const [draws, setDraws] = useState([]); // Listado de partidos emparejados { p1, p2 }
  const [currentPair, setCurrentPair] = useState({ p1: '', p2: '' });
  const [activeSlot, setActiveSlot] = useState(null); // 1, 2 o null
  const [slotText, setSlotText] = useState({ p1: '?', p2: '?' });
  const [drawIndex, setDrawIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const timerRef = useRef(null);
  
  // Barajamos toda la lista internamente al iniciar para predeterminar el resultado justo
  const shuffledResult = useRef([]);
  
  useEffect(() => {
    // Mezcla de Fisher-Yates
    const arr = [...names];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    shuffledResult.current = arr;
    
    // Iniciar el sorteo paso a paso
    startNextDraw(0, [...names], []);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [names]);

  // Ejecuta la lógica para sortear el siguiente partido
  const startNextDraw = (idx, remaining, currentDraws) => {
    const totalPairs = Math.ceil(shuffledResult.current.length / 2);
    
    if (idx >= totalPairs) {
      setIsFinished(true);
      return;
    }

    setDrawIndex(idx);
    setCurrentPair({ p1: '', p2: '' });
    setSlotText({ p1: '?', p2: '?' });
    
    // Obtener los ganadores predeterminados para este par
    const targetP1 = shuffledResult.current[idx * 2];
    const targetP2 = shuffledResult.current[idx * 2 + 1] || 'BYE';

    // 1. Iniciar Slot 1
    setActiveSlot(1);
    animateSlot('p1', targetP1, remaining, () => {
      // Registrar que P1 ya salió y quitarlo de la lista visual de remanentes
      const nextRemainingAfterP1 = remaining.filter(n => n !== targetP1);
      setRemainingPlayers(nextRemainingAfterP1);

      // Si P2 no existe (número impar), es un BYE directo sin ruleta
      if (targetP2 === 'BYE') {
        setSlotText(prev => ({ ...prev, p2: 'BYE' }));
        setTimeout(() => {
          const finalDraw = { p1: targetP1, p2: 'BYE' };
          const nextDraws = [...currentDraws, finalDraw];
          setDraws(nextDraws);
          
          // Siguiente emparejamiento
          timerRef.current = setTimeout(() => {
            startNextDraw(idx + 1, nextRemainingAfterP1, nextDraws);
          }, 1000);
        }, 500);
      } else {
        // 2. Iniciar Slot 2
        setActiveSlot(2);
        animateSlot('p2', targetP2, nextRemainingAfterP1, () => {
          const nextRemainingAfterP2 = nextRemainingAfterP1.filter(n => n !== targetP2);
          setRemainingPlayers(nextRemainingAfterP2);
          setActiveSlot(null);

          // Ambos listos: destello e impacto visual
          timerRef.current = setTimeout(() => {
            const finalDraw = { p1: targetP1, p2: targetP2 };
            const nextDraws = [...currentDraws, finalDraw];
            setDraws(nextDraws);

            // Siguiente emparejamiento
            timerRef.current = setTimeout(() => {
              startNextDraw(idx + 1, nextRemainingAfterP2, nextDraws);
            }, 1000);
          }, 600);
        });
      }
    });
  };

  // Animación estilo tragamonedas que cambia nombres aleatoriamente y frena en el seleccionado
  const animateSlot = (slotKey, targetName, pool, callback) => {
    let ticks = 0;
    const maxTicks = 12;
    const intervalTime = 60; // milisegundos

    const tick = () => {
      if (ticks < maxTicks) {
        // Seleccionar nombre aleatorio del pool disponible
        const randIdx = Math.floor(Math.random() * pool.length);
        setSlotText(prev => ({ ...prev, [slotKey]: pool[randIdx] }));
        ticks++;
        timerRef.current = setTimeout(tick, intervalTime + (ticks * 10)); // se ralentiza gradualmente
      } else {
        // Detenerse exactamente en el nombre objetivo
        setSlotText(prev => ({ ...prev, [slotKey]: targetName }));
        callback();
      }
    };

    tick();
  };

  const handleSkip = () => {
    onComplete(shuffledResult.current);
  };

  const handleFinish = () => {
    onComplete(shuffledResult.current);
  };

  const totalPairs = Math.ceil(shuffledResult.current.length / 2);

  return (
    <div className="shuffle-screen-overlay">
      
      {/* Cabecera del Sorteo */}
      <div className="shuffle-header">
        <div className="shuffle-header-title">
          <Shuffle className="shuffle-title-icon" size={24} />
          <h2>SORTEO DE ENFRENTAMIENTOS</h2>
        </div>
        <button className="btn btn-secondary btn-skip" onClick={handleSkip}>
          <FastForward size={16} />
          Saltar Animación
        </button>
      </div>

      <div className="shuffle-body">
        
        {/* Panel Izquierdo: Jugadores en el bombo */}
        <div className="shuffle-side-panel left-panel">
          <div className="panel-header">
            <h4>BOMBO DE JUGADORES ({remainingPlayers.length})</h4>
          </div>
          <div className="bombo-players-grid">
            {remainingPlayers.map((name, i) => (
              <div key={i} className="bombo-player-chip">
                <span className="bombo-bullet"></span>
                <span className="bombo-player-name">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Central: Ruleta Activa */}
        <div className="shuffle-center-stage">
          <div className="stage-title">
            Partido {Math.min(drawIndex + 1, totalPairs)} de {totalPairs}
          </div>

          <div className="slot-machine-container">
            {/* Slot de Jugador 1 */}
            <div className={`slot-drum ${activeSlot === 1 ? 'drum-spinning' : ''} ${slotText.p1 !== '?' && activeSlot !== 1 ? 'drum-locked' : ''}`}>
              <div className="slot-glow-border"></div>
              <div className="slot-content">
                <div className="slot-label">JUGADOR 1</div>
                <div className="slot-player-display">{slotText.p1}</div>
              </div>
            </div>

            {/* Marcador VS con destello */}
            <div className={`vs-divider-glow ${slotText.p1 !== '?' && slotText.p2 !== '?' && activeSlot === null ? 'vs-impact' : ''}`}>
              <span>VS</span>
              <Zap size={20} className="vs-zap-icon" />
            </div>

            {/* Slot de Jugador 2 */}
            <div className={`slot-drum ${activeSlot === 2 ? 'drum-spinning' : ''} ${slotText.p2 !== '?' && activeSlot !== 2 ? 'drum-locked' : ''}`}>
              <div className="slot-glow-border"></div>
              <div className="slot-content">
                <div className="slot-label">JUGADOR 2</div>
                <div className="slot-player-display">{slotText.p2}</div>
              </div>
            </div>
          </div>

          {isFinished ? (
            <button className="btn btn-primary btn-start-tournament pulse-active" onClick={handleFinish}>
              <Trophy size={18} />
              Empezar Torneo
            </button>
          ) : (
            <div className="drawing-status-text">
              {activeSlot === 1 ? "Buscando oponente 1..." : activeSlot === 2 ? "Buscando oponente 2..." : "¡Enfrentamiento armado!"}
            </div>
          )}
        </div>

        {/* Panel Derecho: Enfrentamientos creados */}
        <div className="shuffle-side-panel right-panel">
          <div className="panel-header">
            <h4>EMPAREJAMIENTOS ARMADOS ({draws.length})</h4>
          </div>
          <div className="drawn-matches-list">
            {draws.map((draw, i) => (
              <div key={i} className="drawn-match-card">
                <div className="drawn-match-index">M-{i + 1}</div>
                <div className="drawn-match-players">
                  <div className="drawn-player-row">
                    <UserCheck size={12} className="drawn-player-icon" />
                    <span>{draw.p1}</span>
                  </div>
                  <div className="drawn-vs-label">vs</div>
                  <div className="drawn-player-row">
                    <UserCheck size={12} className={`drawn-player-icon ${draw.p2 === 'BYE' ? 'text-bye' : ''}`} />
                    <span className={draw.p2 === 'BYE' ? 'text-bye-name' : ''}>{draw.p2}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
