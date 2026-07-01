import React, { useState, useRef } from 'react';
import { Users, Upload, Shuffle, Trash2, Play, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { parseExcelParticipants } from '../utils/excelParser';

export default function ParticipantInput({ onGenerate, onShuffleRequest, currentParticipantsCount }) {
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [isDoubleElim, setIsDoubleElim] = useState(false);
  
  const fileInputRef = useRef(null);

  // Convierte el texto plano en un array de nombres limpios
  const getNamesFromText = (text) => {
    return text
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
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

  // Manejo de archivo Excel
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const names = await parseExcelParticipants(file);
      processImportedNames(names);
    } catch (err) {
      setError(err.message);
    }
    // Limpiar input de archivo
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

    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'xlsx') {
      setError("Solo se admiten archivos en formato Excel (.xlsx).");
      return;
    }

    try {
      const names = await parseExcelParticipants(file);
      processImportedNames(names);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClear = () => {
    setInputText('');
    setError(null);
  };

  // Acción para mezclar e iniciar sorteo interactivo
  const handleShuffleAndGenerate = () => {
    const names = getNamesFromText(inputText);
    if (names.length < 2) {
      setError("Necesitas al menos 2 participantes para generar un torneo.");
      return;
    }
    setError(null);
    onShuffleRequest(names, isDoubleElim);
  };

  const handleGenerateDirect = () => {
    const names = getNamesFromText(inputText);
    if (names.length < 2) {
      setError("Necesitas al menos 2 participantes para generar un torneo.");
      return;
    }
    onGenerate(names, isDoubleElim);
  };

  const currentNamesList = getNamesFromText(inputText);

  return (
    <div className="sidebar-section">
      <h3>
        <Users className="sidebar-section-title-icon" size={18} />
        Participantes ({currentNamesList.length})
      </h3>

      {/* Zona de Drop para Excel */}
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
          accept=".xlsx"
          onChange={handleFileChange}
        />
        <FileSpreadsheet className="dropzone-icon" size={24} />
        <p className="dropzone-text-primary">Importar desde Excel (.xlsx)</p>
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
        <label className="input-label">Nombres (uno por línea)</label>
        <textarea
          className="textarea-participants"
          placeholder="Escribe o pega los nombres de los jugadores aquí...&#10;Jugador 1&#10;Jugador 2&#10;Jugador 3"
          value={inputText}
          onChange={handleTextChange}
        />
      </div>

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
        >
          <Trash2 size={16} />
          Limpiar
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={handleGenerateDirect}
          disabled={currentNamesList.length < 2}
        >
          <Play size={16} />
          Ordenar
        </button>
      </div>

      <button 
        className="btn btn-primary w-full pulse-active"
        style={{ marginTop: '12px', width: '100%' }}
        onClick={handleShuffleAndGenerate}
        disabled={currentNamesList.length < 2}
      >
        <Shuffle size={16} />
        Aleatorizar y Crear Bracket
      </button>
    </div>
  );
}
