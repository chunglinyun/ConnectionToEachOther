import React from 'react';

export default function ClientList({ clients, selectedId, onSelect, onRescan }) {
  return (
    <div className="client-list-panel">
      <h6 className="panel-title">線上裝置</h6>
      {clients.length === 0 ? (
        <p className="no-clients">掃描中...</p>
      ) : (
        <ul className="client-list">
          {clients.map((c) => (
            <li
              key={c.connectionId}
              className={`client-item ${selectedId === c.connectionId ? 'selected' : ''}`}
              onClick={() => onSelect(c)}
            >
              <span className="client-dot" />
              {c.displayName}
            </li>
          ))}
        </ul>
      )}
      <button className="btn-rescan" onClick={onRescan}>
        重新掃描
      </button>
    </div>
  );
}
