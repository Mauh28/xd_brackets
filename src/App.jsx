import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ParticipantInput from './components/ParticipantInput';
import SavedBrackets from './components/SavedBrackets';
import BracketViewer from './components/BracketViewer';
import { generateTournament, updateTournamentMatchWinner } from './utils/bracketLogic';
import ShuffleOverlay from './components/ShuffleOverlay';

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
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
