import React, { useState, useRef } from 'react';
import { Users, Shuffle, Trash2, Play, FileSpreadsheet, AlertCircle, UsersRound, PenLine } from 'lucide-react';
import { parseExcelParticipants } from '../utils/excelParser';

export default function ParticipantInput({ onGenerate, onShuffleRequest, onImportJson }) {
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [isDoubleElim, setIsDoubleElim] = useState(false);
  const [is2v2, setIs2v2] = useState(false);
  const [canNameTeams, setCanNameTeams] = useState(false);
  const [randomize, setRandomize] = useState(true);
  const [teamNames, setTeamNames] = useState({}); // { 0: "Los Invencibles", 1: "Team Rocket", ... }
  
  const fileInputRef = useRef(null);

  // Convierte el texto plano en un array de nombres limpios
  const getNamesFromText = (text) => {
    return text
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  };

  // Agrupa nombres en equipos de 2
  const getTeamsFromNames = (names) => {
    const teams = [];
    for (let i = 0; i < names.length - 1; i += 2) {
      teams.push({ members: [names[i], names[i + 1]], index: teams.length });
    }
    return teams;
  };

  // Mezcla aleatoria (Fisher-Yates)
  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Construye los nombres finales de equipos para el bracket
  const buildTeamNamesForBracket = (names, randomize = false) => {
    const ordered = randomize ? shuffleArray(names) : names;
    const teams = getTeamsFromNames(ordered);
    return teams.map((team, i) => {
      if (canNameTeams && teamNames[i]?.trim()) {
        return teamNames[i].trim();
      }
      // ponytail: nombre por defecto = "Jugador1-Jugador2"
      return `${team.members[0]}-${team.members[1]}`;
    });
  };

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    setError(null);
  };

  const processImportedNames = (names) => {
    if (names.length === 0) {
      setError("No se encontraron nombres válidos en el archivo.");
      return;
    }
    const currentNames = getNamesFromText(inputText);
    const combinedNames = [...new Set([...currentNames, ...names])]; // Evita duplicados
    setInputText(combinedNames.join('\n'));
    setError(null);
  };

  // Procesa e importa el archivo según su tipo (.xlsx o .json)
  const handleImportFile = async (file) => {
    if (!file) return;
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt === 'json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          onImportJson(parsed);
        } catch (err) {
          setError("El archivo JSON no es válido.");
        }
      };
      reader.readAsText(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      try {
        const names = await parseExcelParticipants(file);
        processImportedNames(names);
      } catch (err) {
        setError(err.message);
      }
    } else {
      setError("Formato de archivo no soportado. Utiliza .xlsx, .xls o .json.");
    }
  };

  // Manejo de archivo importado por click
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleImportFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await handleImportFile(file);
  };

  const handleClear = () => {
    setInputText('');
    setError(null);
    setTeamNames({});
  };

  const validate = (names) => {
    if (is2v2) {
      if (names.length < 4) {
        setError("Necesitas al menos 4 jugadores para formar 2 equipos (2v2).");
        return false;
      }
      if (names.length % 2 !== 0) {
        setError("En modo 2v2, necesitas un número par de jugadores para formar equipos.");
        return false;
      }
    } else {
      if (names.length < 2) {
        setError("Necesitas al menos 2 participantes para generar un torneo.");
        return false;
      }
    }
    return true;
  };

  // Acción para mezclar e iniciar sorteo interactivo
  const handleShuffleAndGenerate = () => {
    const names = getNamesFromText(inputText);
    if (!validate(names)) return;
    setError(null);

    if (is2v2) {
      const bracketNames = buildTeamNamesForBracket(names, randomize);
      onShuffleRequest(bracketNames, isDoubleElim, true);
    } else {
      onShuffleRequest(names, isDoubleElim, false);
    }
  };

  const handleGenerateDirect = () => {
    const names = getNamesFromText(inputText);
    if (!validate(names)) return;
    setError(null);

    if (is2v2) {
      const bracketNames = buildTeamNamesForBracket(names, randomize);
      onGenerate(bracketNames, isDoubleElim, true);
    } else {
      const finalNames = randomize ? shuffleArray(names) : names;
      onGenerate(finalNames, isDoubleElim, false);
    }
  };

  const handleTeamNameChange = (index, value) => {
    setTeamNames(prev => ({ ...prev, [index]: value }));
  };

  const currentNamesList = getNamesFromText(inputText);
  const teams = is2v2 ? getTeamsFromNames(currentNamesList) : [];
  const hasOddPlayer = is2v2 && currentNamesList.length % 2 !== 0;

  return (
    <div className="sidebar-section">
      <h3>
        <Users className="sidebar-section-title-icon" size={18} />
        Participantes ({currentNamesList.length})
      </h3>

      <div 
        className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".xlsx, .xls, .json"
          onChange={handleFileChange}
        />
        <FileSpreadsheet className="dropzone-icon" size={24} />
        <p className="dropzone-text-primary">Importar desde Excel (.xlsx) / JSON</p>
        <p className="dropzone-text-secondary">Arrastra tu archivo aquí o haz clic</p>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Entrada Manual de Texto */}
      <div className="textarea-container">
        <label className="input-label">
          {is2v2 ? 'Jugadores (uno por línea, se emparejan de a 2)' : 'Nombres (uno por línea)'}
        </label>
        <textarea
          className="textarea-participants"
          placeholder={is2v2 
            ? "Jugadores se emparejan automáticamente:\nJugador 1  ⎫ Equipo 1\nJugador 2  ⎭\nJugador 3  ⎫ Equipo 2\nJugador 4  ⎭"
            : "Escribe o pega los nombres de los jugadores aquí...\nJugador 1\nJugador 2\nJugador 3"
          }
          value={inputText}
          onChange={handleTextChange}
        />
      </div>

      {/* Toggle de Modo 2v2 */}
      <div className="double-elim-toggle-container">
        <label className="switch">
          <input 
            type="checkbox" 
            checked={is2v2}
            onChange={(e) => {
              setIs2v2(e.target.checked);
              if (!e.target.checked) {
                setCanNameTeams(false);
                setTeamNames({});
              }
              setError(null);
            }}
          />
          <span className="slider round"></span>
        </label>
        <span className="switch-label">
          <UsersRound size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          Modo 2v2 (Equipos)
        </span>
      </div>

      {/* Switch para nombrar equipos (solo visible en modo 2v2) */}
      {is2v2 && (
        <div className="double-elim-toggle-container">
          <label className="switch">
            <input 
              type="checkbox" 
              checked={canNameTeams}
              onChange={(e) => setCanNameTeams(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
          <span className="switch-label">
            <PenLine size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Nombrar equipos
          </span>
        </div>
      )}

      {/* Switch para sorteo aleatorio (siempre visible) */}
      <div className="double-elim-toggle-container">
        <label className="switch">
          <input 
            type="checkbox" 
            checked={randomize}
            onChange={(e) => setRandomize(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
        <span className="switch-label">
          <Shuffle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          Sorteo aleatorio
        </span>
      </div>

      {/* Preview de equipos en modo 2v2 */}
      {is2v2 && teams.length > 0 && (
        <div className="teams-preview">
          <label className="input-label">Equipos formados ({teams.length}){randomize && <em style={{fontWeight: 400, fontSize: '11px', color: 'var(--text-muted)'}}> — se mezclan al generar</em>}</label>
          <div className="teams-preview-list">
            {teams.map((team, i) => (
              <div key={i} className="team-preview-item">
                <div className="team-preview-header">
                  {canNameTeams ? (
                    <input
                      type="text"
                      className="team-name-input"
                      placeholder={`${team.members[0]}-${team.members[1]}`}
                      value={teamNames[i] || ''}
                      onChange={(e) => handleTeamNameChange(i, e.target.value)}
                    />
                  ) : (
                    <span className="team-name-default">{team.members[0]}-{team.members[1]}</span>
                  )}
                </div>
                <div className="team-members">
                  <span>{team.members[0]}</span>
                  <span className="team-separator">&</span>
                  <span>{team.members[1]}</span>
                </div>
              </div>
            ))}
          </div>
          {hasOddPlayer && (
            <div className="error-message" style={{ marginTop: '8px' }}>
              <AlertCircle size={14} />
              <span>Hay un jugador sin pareja. Añade uno más para completar el equipo.</span>
            </div>
          )}
        </div>
      )}

      {/* Toggle de Doble Eliminación */}
      <div className="double-elim-toggle-container">
        <label className="switch">
          <input 
            type="checkbox" 
            checked={isDoubleElim}
            onChange={(e) => setIsDoubleElim(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
        <span className="switch-label">Doble Eliminación (Perdedores)</span>
      </div>

      {/* Controles de Acción */}
      <div className="action-buttons-grid">
        <button 
          className="btn btn-secondary" 
          onClick={handleClear}
          disabled={currentNamesList.length === 0}
          style={{ gridColumn: randomize ? 'span 1' : 'span 2' }}
        >
          <Trash2 size={16} />
          Limpiar
        </button>
        {randomize && (
          <button 
            className="btn btn-secondary" 
            onClick={handleGenerateDirect}
            disabled={is2v2 ? teams.length < 2 : currentNamesList.length < 2}
          >
            <Play size={16} />
            Ordenar
          </button>
        )}
      </div>

      <button 
        className="btn btn-primary w-full pulse-active"
        style={{ marginTop: '12px', width: '100%' }}
        onClick={randomize ? handleShuffleAndGenerate : handleGenerateDirect}
        disabled={is2v2 ? teams.length < 2 : currentNamesList.length < 2}
      >
        {randomize ? <Shuffle size={16} /> : <Play size={16} />}
        {randomize ? "Aleatorizar y Crear Bracket" : "Crear Bracket"}
      </button>
    </div>
  );
}
