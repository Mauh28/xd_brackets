import React, { useRef } from 'react';
import { Save, RotateCcw, Download, Upload, Trophy, Edit3 } from 'lucide-react';

export default function Header({ 
  title, 
  onTitleChange, 
  onSave, 
  onReset, 
  onExport, 
  onImportJson,
  hasActiveBracket
}) {
  const jsonInputRef = useRef(null);

  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        onImportJson(parsed);
      } catch (err) {
        alert("El archivo JSON no es válido.");
      }
    };
    reader.readAsText(file);
    // Limpiar input
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <Trophy className="header-logo" size={24} />
        <span className="brand-name">XD_BRACKETS</span>
      </div>

      <div className="header-title-container">
        {hasActiveBracket ? (
          <div className="title-edit-wrapper">
            <Edit3 className="title-edit-icon" size={16} />
            <input 
              type="text" 
              className="bracket-title-input" 
              value={title} 
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Título de la Bracket"
              maxLength={40}
            />
          </div>
        ) : (
          <div className="no-bracket-title">Crea o importa un torneo para empezar</div>
        )}
      </div>

      <div className="header-actions">
        {/* Input oculto para JSON */}
        <input 
          type="file" 
          ref={jsonInputRef} 
          style={{ display: 'none' }} 
          accept=".json"
          onChange={handleJsonUpload}
        />
        
        <button 
          className="btn btn-secondary" 
          onClick={() => jsonInputRef.current?.click()}
          title="Importar torneo desde archivo JSON"
        >
          <Upload size={16} />
          <span>Importar JSON</span>
        </button>

        {hasActiveBracket && (
          <>
            <button 
              className="btn btn-secondary" 
              onClick={onExport}
              title="Exportar torneo actual como archivo JSON"
            >
              <Download size={16} />
              <span>Exportar</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={onReset}
              title="Reiniciar todos los enfrentamientos"
            >
              <RotateCcw size={16} />
              <span>Reiniciar</span>
            </button>

            <button 
              className="btn btn-primary" 
              onClick={onSave}
              title="Guardar torneo en la memoria local"
            >
              <Save size={16} />
              <span>Guardar</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
