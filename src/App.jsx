import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ParticipantInput from './components/ParticipantInput';
import SavedBrackets from './components/SavedBrackets';
import BracketViewer from './components/BracketViewer';
import { generateTournament, updateTournamentMatchWinner } from './utils/bracketLogic';
import ShuffleOverlay from './components/ShuffleOverlay';
import { toPng } from 'html-to-image';

export default function App() {
  const [tournament, setTournament] = useState(null);
  const [shuffleList, setShuffleList] = useState(null);
  const [isDoubleElimTemp, setIsDoubleElimTemp] = useState(false);
  const [bracketTitle, setBracketTitle] = useState('');
  const [hoveredParticipantId, setHoveredParticipantId] = useState(null);
  const [savedBrackets, setSavedBrackets] = useState([]);
  const [currentBracketId, setCurrentBracketId] = useState(null);

  // Cargar brackets guardadas de localStorage al iniciar
  useEffect(() => {
    const localData = localStorage.getItem('xd_brackets_saved');
    if (localData) {
      try {
        setSavedBrackets(JSON.parse(localData));
      } catch (e) {
        console.error("Error al cargar brackets locales", e);
      }
    }
  }, []);

  // Guardar lista general de brackets en localStorage cada vez que cambia
  const updateSavedBrackets = (newSavedList) => {
    setSavedBrackets(newSavedList);
    localStorage.setItem('xd_brackets_saved', JSON.stringify(newSavedList));
  };

  // Acción: Generar nueva bracket (soporta simple y doble eliminación)
  const handleGenerate = (names, isDoubleElim = false) => {
    const generated = generateTournament(names, isDoubleElim);
    setTournament(generated);
    
    const count = names.length;
    const defaultTitle = `Torneo de ${count} Participantes`;
    setBracketTitle(defaultTitle);
    
    // Resetear ID actual de guardado ya que es un torneo nuevo
    setCurrentBracketId(null);
  };

  // Acción: Iniciar sorteo interactivo guardando el flag temporalmente
  const handleShuffleRequest = (names, isDoubleElim) => {
    setShuffleList(names);
    setIsDoubleElimTemp(isDoubleElim);
  };

  // Acción: Avanzar participante
  const handleSelectWinner = (matchId, winner) => {
    const updated = updateTournamentMatchWinner(tournament, matchId, winner);
    setTournament(updated);
  };

  // Acción: Reiniciar ganadores del torneo actual (mantiene emparejamientos originales de la Ronda 0)
  const handleReset = () => {
    if (!tournament) return;
    if (!window.confirm("¿Seguro que quieres reiniciar el progreso de este torneo? Se borrarán todos los ganadores y avances.")) {
      return;
    }

    // Obtener los nombres iniciales a partir de la Ronda 0 de ganadores
    const initialNames = [];
    tournament.winnersRounds[0].matches.forEach(match => {
      if (match.p1 && !match.p1.isBye) initialNames.push(match.p1.name);
      if (match.p2 && !match.p2.isBye) initialNames.push(match.p2.name);
    });

    const resetTournament = generateTournament(initialNames, tournament.isDoubleElimination);
    setTournament(resetTournament);
  };

  // Acción: Guardar torneo actual
  const handleSave = () => {
    if (!tournament || tournament.winnersRounds.length === 0) return;

    const titleToSave = bracketTitle.trim() || 'Torneo sin título';
    const bracketId = currentBracketId || Math.random().toString(36).substr(2, 9);
    
    const bracketData = {
      id: bracketId,
      title: titleToSave,
      tournament: tournament,
      rounds: tournament.winnersRounds, // backward compatibility
      updatedAt: Date.now()
    };

    let updatedList;
    const existingIndex = savedBrackets.findIndex(b => b.id === bracketId);

    if (existingIndex >= 0) {
      // Actualizar existente
      updatedList = [...savedBrackets];
      updatedList[existingIndex] = bracketData;
    } else {
      // Agregar nuevo
      updatedList = [bracketData, ...savedBrackets];
    }

    updateSavedBrackets(updatedList);
    setCurrentBracketId(bracketId);
    setBracketTitle(titleToSave); // Actualizar por si se recortaron espacios
    
    alert(`Torneo "${titleToSave}" guardado correctamente.`);
  };

  // Acción: Cargar torneo guardado
  const handleLoad = (id) => {
    const bracket = savedBrackets.find(b => b.id === id);
    if (!bracket) return;

    if (bracket.tournament) {
      setTournament(bracket.tournament);
    } else {
      // Compatibilidad con formatos guardados antiguos
      setTournament({
        isDoubleElimination: false,
        winnersRounds: bracket.rounds,
        losersRounds: [],
        grandFinal: null
      });
    }
    setBracketTitle(bracket.title);
    setCurrentBracketId(bracket.id);
  };

  // Acción: Eliminar torneo guardado
  const handleDelete = (id) => {
    const bracket = savedBrackets.find(b => b.id === id);
    if (!bracket) return;

    if (!window.confirm(`¿Estás seguro de que quieres eliminar el torneo "${bracket.title}"?`)) {
      return;
    }

    const updatedList = savedBrackets.filter(b => b.id !== id);
    updateSavedBrackets(updatedList);

    // Si el torneo eliminado es el que está en pantalla, limpiar id actual
    if (currentBracketId === id) {
      setCurrentBracketId(null);
    }
  };

  // Acción: Exportar como JSON
  const handleExport = () => {
    if (!tournament) return;

    const exportData = {
      title: bracketTitle,
      tournament: tournament,
      rounds: tournament.winnersRounds, // backward compatibility
      exportedAt: Date.now()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    
    const fileName = `${bracketTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_bracket.json`;
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Acción: Exportar bracket como imagen PNG (formato profesional centrado con título, fondo glow y fecha)
  const handleExportImage = () => {
    const canvasNode = document.querySelector('.bracket-canvas-container');
    if (!canvasNode) return;

    // 1. Crear un contenedor wrapper invisible fuera de pantalla con flexbox centrado y gradiente de fondo
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      left: -99999px;
      top: 0;
      background: radial-gradient(circle at 50% 0%, rgba(225, 29, 72, 0.12) 0%, #020202 75%);
      background-color: #020202;
      padding: 0;
      font-family: 'Outfit', 'Inter', sans-serif;
      color: #e2e2e2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      box-sizing: border-box;
    `;

    // 2. Cabecera con título del torneo
    const header = document.createElement('div');
    header.style.cssText = `
      width: 100%;
      text-align: center;
      padding: 45px 60px 28px 60px;
      border-bottom: 2px solid rgba(225, 29, 72, 0.45);
      box-sizing: border-box;
    `;
    const brandLine = document.createElement('div');
    brandLine.textContent = 'xd_brackets';
    brandLine.style.cssText = `
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: lowercase;
      color: rgba(225, 29, 72, 0.85);
      margin-bottom: 8px;
    `;
    const titleLine = document.createElement('div');
    titleLine.textContent = bracketTitle || 'Torneo sin título';
    titleLine.style.cssText = `
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 0.02em;
      color: #ffffff;
      text-shadow: 0 0 25px rgba(225, 29, 72, 0.45);
    `;

    const typeLine = document.createElement('div');
    typeLine.textContent = tournament?.isDoubleElimination ? 'Doble Eliminación (Con Perdedores)' : 'Eliminación Directa';
    typeLine.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.35);
      margin-top: 8px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    `;

    header.appendChild(brandLine);
    header.appendChild(titleLine);
    header.appendChild(typeLine);
    wrapper.appendChild(header);

    // 3. Contenido del bracket (clon del canvas), centrado
    const bracketClone = canvasNode.cloneNode(true);
    bracketClone.style.cssText = `
      transform: translate(0px, 0px) scale(1);
      transform-origin: 0 0;
      padding: 50px 80px;
      display: inline-block;
      background: transparent;
      margin: 0 auto;
    `;
    wrapper.appendChild(bracketClone);

    // 4. Pie de página con fecha alineada a la derecha
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const footer = document.createElement('div');
    footer.style.cssText = `
      width: 100%;
      text-align: right;
      padding: 20px 60px 35px 60px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      box-sizing: border-box;
      margin-top: auto;
    `;
    const dateLine = document.createElement('div');
    dateLine.textContent = `${dateStr} — ${timeStr}`;
    dateLine.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.25);
      letter-spacing: 0.05em;
    `;
    const poweredLine = document.createElement('div');
    poweredLine.textContent = 'Generado con xd_brackets';
    poweredLine.style.cssText = `
      font-size: 10px;
      font-weight: 600;
      color: rgba(225, 29, 72, 0.4);
      margin-top: 4px;
      letter-spacing: 0.05em;
    `;
    footer.appendChild(dateLine);
    footer.appendChild(poweredLine);
    wrapper.appendChild(footer);

    // 5. Montar temporalmente en el DOM para medir y capturar
    document.body.appendChild(wrapper);

    setTimeout(() => {
      toPng(wrapper, { 
        backgroundColor: '#020202',
        skipFonts: true
      })
        .then((dataUrl) => {
          const link = document.createElement('a');
          const fileName = `${bracketTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_bracket.png`;
          link.download = fileName;
          link.href = dataUrl;
          link.click();
        })
        .catch(() => {
          alert('Error al generar la imagen de la bracket.');
        })
        .finally(() => {
          document.body.removeChild(wrapper);
        });
    }, 150);
  };

  // Acción: Importar desde JSON
  const handleImportJson = (data) => {
    const importedTournament = data.tournament ? data.tournament : (
      data.rounds ? {
        isDoubleElimination: false,
        winnersRounds: data.rounds,
        losersRounds: [],
        grandFinal: null
      } : null
    );

    if (!data.title || !importedTournament) {
      alert("El formato del archivo JSON no es compatible con xd_brackets.");
      return;
    }

    setTournament(importedTournament);
    setBracketTitle(data.title);
    setCurrentBracketId(null); // Importado como nuevo torneo
    alert(`Torneo "${data.title}" importado correctamente.`);
  };

  const hasActiveBracket = tournament !== null && tournament.winnersRounds.length > 0;

  return (
    <div id="root">
      <Header 
        title={bracketTitle}
        onTitleChange={setBracketTitle}
        onSave={handleSave}
        onReset={handleReset}
        onExport={handleExport}
        onExportImage={handleExportImage}
        onImportJson={handleImportJson}
        hasActiveBracket={hasActiveBracket}
      />

      <div className="app-container">
        {/* Panel lateral izquierdo */}
        <aside className="sidebar">
          <ParticipantInput 
            onGenerate={handleGenerate}
            onShuffleRequest={handleShuffleRequest}
            currentParticipantsCount={
              hasActiveBracket 
                ? tournament.winnersRounds[0].matches.reduce((acc, m) => {
                    if (m.p1 && !m.p1.isBye) acc++;
                    if (m.p2 && !m.p2.isBye) acc++;
                    return acc;
                  }, 0)
                : 0
            }
          />
          <SavedBrackets 
            savedBrackets={savedBrackets}
            onLoad={handleLoad}
            onDelete={handleDelete}
          />
        </aside>

        {/* Visualizador central */}
        <main className="main-content">
          <BracketViewer 
            tournament={tournament}
            hoveredId={hoveredParticipantId}
            onHover={setHoveredParticipantId}
            onSelectWinner={handleSelectWinner}
          />
        </main>
      </div>

      {shuffleList && (
        <ShuffleOverlay 
          names={shuffleList}
          onComplete={(shuffled) => {
            setShuffleList(null);
            handleGenerate(shuffled, isDoubleElimTemp);
          }}
          onClose={() => setShuffleList(null)}
        />
      )}
    </div>
  );
}
