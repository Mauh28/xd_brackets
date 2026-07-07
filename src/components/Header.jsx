import React, { useRef } from 'react';
import { Save, RotateCcw, Download, Upload, Trophy, Edit3, Image, FileSpreadsheet } from 'lucide-react';

export default function Header({ 
  title, 
  onTitleChange, 
  onSave, 
  onReset, 
  onExport, 
  onExportImage,
  onExportExcel,
  hasActiveBracket
}) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <Trophy className="header-logo" size={24} />
        <span className="brand-name">xd_brackets</span>
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
        {hasActiveBracket && (
          <>
            <button 
              className="btn btn-secondary" 
              onClick={onExport}
              title="Exportar torneo actual como archivo JSON"
            >
              <Download size={16} />
              <span>Exportar JSON</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={onExportExcel}
              title="Exportar torneo actual como archivo Excel .xlsx"
            >
              <FileSpreadsheet size={16} />
              <span>Exportar Excel</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={onExportImage}
              title="Descargar bracket como imagen PNG"
            >
              <Image size={16} />
              <span>Guardar Imagen</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={onReset}
              title="Reiniciar todos los matches de la bracket"
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
