import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ParticipantInput from './components/ParticipantInput';
import SavedBrackets from './components/SavedBrackets';
import BracketViewer from './components/BracketViewer';
import { generateBracket, setMatchWinner, propagateWinners } from './utils/bracketLogic';

export default function App() {
  const [rounds, setRounds] = useState([]);
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

  // Acción: Generar nueva bracket
  const handleGenerate = (names) => {
    const generatedRounds = generateBracket(names);
    setRounds(generatedRounds);
    
    const count = names.length;
    const defaultTitle = `Torneo de ${count} Participantes`;
    setBracketTitle(defaultTitle);
    
    // Resetear ID actual de guardado ya que es un torneo nuevo
    setCurrentBracketId(null);
  };

  // Acción: Avanzar participante
  const handleSelectWinner = (matchId, winner) => {
    const updatedRounds = setMatchWinner(rounds, matchId, winner);
    setRounds(updatedRounds);
  };

  // Acción: Reiniciar ganadores del torneo actual (mantiene emparejamientos originales)
  const handleReset = () => {
    if (rounds.length === 0) return;
    if (!window.confirm("¿Seguro que quieres reiniciar el progreso de este torneo? Se borrarán todos los ganadores.")) {
      return;
    }

    const updatedRounds = JSON.parse(JSON.stringify(rounds));
    
    // Limpiar ganadores y marcadores
    updatedRounds.forEach(round => {
      round.matches.forEach(match => {
        match.winner = null;
        match.score1 = null;
        match.score2 = null;
        if (round.index > 0) {
          match.p1 = null;
          match.p2 = null;
        }
      });
    });

    // Reestablecer ganadores por BYE en la ronda 0
    updatedRounds[0].matches.forEach(match => {
      if (match.p1?.isBye && match.p2?.isBye) {
        match.winner = null;
      } else if (match.p1?.isBye) {
        match.winner = match.p2;
      } else if (match.p2?.isBye) {
        match.winner = match.p1;
      }
    });

    // Propagar byes
    propagateWinners(updatedRounds);
    setRounds(updatedRounds);
  };

  // Acción: Guardar torneo actual
  const handleSave = () => {
    if (rounds.length === 0) return;

    const titleToSave = bracketTitle.trim() || 'Torneo sin título';
    const bracketId = currentBracketId || Math.random().toString(36).substr(2, 9);
    
    const bracketData = {
      id: bracketId,
      title: titleToSave,
      rounds: rounds,
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
    
    // Breve alerta visual / feedback
    alert(`Torneo "${titleToSave}" guardado correctamente.`);
  };

  // Acción: Cargar torneo guardado
  const handleLoad = (id) => {
    const bracket = savedBrackets.find(b => b.id === id);
    if (!bracket) return;

    setRounds(bracket.rounds);
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
    if (rounds.length === 0) return;

    const exportData = {
      title: bracketTitle,
      rounds: rounds,
      exportedAt: Date.now()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    
    const fileName = `${bracketTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_bracket.json`;
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Acción: Importar desde JSON
  const handleImportJson = (data) => {
    if (!data.title || !data.rounds) {
      alert("El formato del archivo JSON no es compatible con XD_BRACKETS.");
      return;
    }

    setRounds(data.rounds);
    setBracketTitle(data.title);
    setCurrentBracketId(null); // Importado como nuevo torneo para que no pise existentes
    alert(`Torneo "${data.title}" importado correctamente.`);
  };

  const hasActiveBracket = rounds.length > 0;

  return (
    <div id="root">
      <Header 
        title={bracketTitle}
        onTitleChange={setBracketTitle}
        onSave={handleSave}
        onReset={handleReset}
        onExport={handleExport}
        onImportJson={handleImportJson}
        hasActiveBracket={hasActiveBracket}
      />

      <div className="app-container">
        {/* Panel lateral izquierdo */}
        <aside className="sidebar">
          <ParticipantInput 
            onGenerate={handleGenerate}
            currentParticipantsCount={
              hasActiveBracket 
                ? rounds[0].matches.reduce((acc, m) => {
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
            rounds={rounds}
            hoveredId={hoveredParticipantId}
            onHover={setHoveredParticipantId}
            onSelectWinner={handleSelectWinner}
          />
        </main>
      </div>
    </div>
  );
}
