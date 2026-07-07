import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ParticipantInput from './components/ParticipantInput';
import SavedBrackets from './components/SavedBrackets';
import BracketViewer from './components/BracketViewer';
import { generateTournament, updateTournamentMatchWinner, swapTournamentParticipants } from './utils/bracketLogic';
import { exportExcelTournament } from './utils/excelParser';
import ShuffleOverlay from './components/ShuffleOverlay';
import { toPng } from 'html-to-image';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [tournament, setTournament] = useState(null);
  const [shuffleList, setShuffleList] = useState(null);
  const [isDoubleElimTemp, setIsDoubleElimTemp] = useState(false);
  const [bracketTitle, setBracketTitle] = useState('');
  const [hoveredParticipantId, setHoveredParticipantId] = useState(null);
  const [savedBrackets, setSavedBrackets] = useState([]);
  const [currentBracketId, setCurrentBracketId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Acción: Generar nueva bracket (soporta simple y doble eliminación, 1v1 y 2v2)
  const handleGenerate = (names, isDoubleElim = false, is2v2 = false) => {
    const generated = generateTournament(names, isDoubleElim, is2v2);
    setTournament(generated);
    
    const count = names.length;
    const defaultTitle = is2v2
      ? `Torneo 2v2 de ${count} Equipos`
      : `Torneo de ${count} Participantes`;
    setBracketTitle(defaultTitle);
    
    // Resetear ID actual de guardado ya que es un torneo nuevo
    setCurrentBracketId(null);

    // Auto-colapsar sidebar en móvil al generar
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const [is2v2Temp, setIs2v2Temp] = useState(false);

  // Acción: Iniciar sorteo interactivo guardando los flags temporalmente
  const handleShuffleRequest = (names, isDoubleElim, is2v2 = false) => {
    setShuffleList(names);
    setIsDoubleElimTemp(isDoubleElim);
    setIs2v2Temp(is2v2);
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

    const resetTournament = generateTournament(initialNames, tournament.isDoubleElimination, tournament.is2v2);
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

  // Acción: Exportar como Excel (.xlsx)
  const handleExportExcel = () => {
    if (!tournament) return;
    exportExcelTournament(tournament, bracketTitle);
  };

  // Acción: Intercambiar participantes en el cuadro de siembra inicial (Ronda 0)
  const handleSwapParticipants = (p1Id, p2Id) => {
    if (!tournament) return;
    const updated = swapTournamentParticipants(tournament, p1Id, p2Id);
    setTournament(updated);
  };

  // Acción: Exportar bracket como imagen PNG (usando clase temporal en el DOM para evitar clones vacíos)
  const handleExportImage = () => {
    const wrapper = document.getElementById('bracket-export-area');
    if (!wrapper) return;

    // 1. Activar clase de exportación para forzar diseño centrado y estructurado
    wrapper.classList.add('is-exporting');

    // 2. Capturar con html-to-image (skipFonts evita SecurityErrors de Google Fonts)
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
        .catch((err) => {
          console.error("Error exporting image:", err);
          alert('Error al generar la imagen de la bracket.');
        })
        .finally(() => {
          // 3. Restaurar estado visual original para el usuario
          wrapper.classList.remove('is-exporting');
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
        onExportExcel={handleExportExcel}
        hasActiveBracket={hasActiveBracket}
      />

      <div className="app-container">
        {/* Botón hamburguesa para móvil */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label={sidebarOpen ? 'Cerrar panel' : 'Abrir panel'}
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Panel lateral izquierdo */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
          <ParticipantInput 
            onGenerate={handleGenerate}
            onShuffleRequest={handleShuffleRequest}
            onImportJson={handleImportJson}
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
            bracketTitle={bracketTitle}
            hoveredId={hoveredParticipantId}
            onHover={setHoveredParticipantId}
            onSelectWinner={handleSelectWinner}
            sidebarOpen={sidebarOpen}
            onSwapParticipants={handleSwapParticipants}
          />
        </main>
      </div>

      {shuffleList && (
        <ShuffleOverlay 
          names={shuffleList}
          onComplete={(shuffled) => {
            setShuffleList(null);
            handleGenerate(shuffled, isDoubleElimTemp, is2v2Temp);
          }}
          onClose={() => setShuffleList(null)}
        />
      )}
    </div>
  );
}
