import React from 'react';
import { Bookmark, FolderOpen, Trash2, Calendar } from 'lucide-react';

export default function SavedBrackets({ 
  savedBrackets, 
  onLoad, 
  onDelete 
}) {
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="sidebar-section saved-brackets-section" style={{ flexGrow: 1, borderBottom: 'none' }}>
      <h3>
        <Bookmark className="sidebar-section-title-icon" size={18} />
        Torneos Guardados ({savedBrackets.length})
      </h3>

      {savedBrackets.length === 0 ? (
        <div className="empty-saved-placeholder">
          <FolderOpen className="empty-saved-icon" size={32} />
          <p>No tienes torneos guardados todavía.</p>
          <p className="empty-saved-desc">Guarda el torneo actual desde la barra superior.</p>
        </div>
      ) : (
        <div className="saved-brackets-list">
          {savedBrackets.map((bracket) => {
            // Calcular el número total de participantes a partir de los datos guardados
            const count = bracket.rounds[0]?.matches.reduce((acc, match) => {
              if (match.p1 && !match.p1.isBye) acc++;
              if (match.p2 && !match.p2.isBye) acc++;
              return acc;
            }, 0) || 0;

            return (
              <div key={bracket.id} className="saved-bracket-item">
                <div className="saved-bracket-info" onClick={() => onLoad(bracket.id)}>
                  <div className="saved-bracket-title">{bracket.title}</div>
                  <div className="saved-bracket-meta">
                    <span className="saved-bracket-players">{count} jugadores</span>
                    <span className="saved-bracket-date">
                      <Calendar size={10} style={{ marginRight: '3px' }} />
                      {formatDate(bracket.updatedAt)}
                    </span>
                  </div>
                </div>
                <button 
                  className="btn btn-secondary btn-icon-only saved-bracket-delete-btn"
                  onClick={() => onDelete(bracket.id)}
                  title="Eliminar este torneo guardado"
                >
                  <Trash2 size={14} className="delete-icon" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
