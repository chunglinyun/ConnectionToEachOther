import React from 'react';

export default function IncomingRequestModal({ request, onAccept, onDecline }) {
  if (!request) return null;

  const totalSize = request.files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h5>收到傳輸請求</h5>
        <p>
          <strong>{request.fromName}</strong> 想傳送 {request.files.length} 個檔案
          （{formatSize(totalSize)}）
        </p>
        <ul className="modal-file-list">
          {request.files.slice(0, 5).map((f, i) => (
            <li key={i}>{f.name} — {formatSize(f.size)}</li>
          ))}
          {request.files.length > 5 && <li>...還有 {request.files.length - 5} 個</li>}
        </ul>
        <div className="modal-actions">
          <button className="btn-decline" onClick={onDecline}>拒絕</button>
          <button className="btn-accept" onClick={onAccept}>接受</button>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
