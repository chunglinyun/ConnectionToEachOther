import React from 'react';

export default function TransferQueue({ transfers, receivedFiles }) {
  if (transfers.length === 0 && receivedFiles.length === 0) return null;

  return (
    <div className="transfer-queue">
      <h6 className="queue-title">傳輸佇列</h6>

      {transfers.map((t, i) => (
        <div key={i} className={`transfer-item ${t.status}`}>
          <span className="t-icon">📤</span>
          <span className="t-name">{t.fileName}</span>
          <div className="t-progress-bar">
            <div className="t-progress-fill" style={{ width: `${t.progress}%` }} />
          </div>
          <span className="t-percent">{t.progress}%</span>
          <span className="t-target">→ {t.targetName}</span>
          <span className={`t-status ${t.status}`}>
            {t.status === 'done' ? '完成 ✓' : t.status === 'error' ? '失敗 ✗' : '傳輸中'}
          </span>
        </div>
      ))}

      {receivedFiles.map((f, i) => (
        <div key={'r' + i} className="transfer-item received">
          <span className="t-icon">📥</span>
          <span className="t-name">{f.name}</span>
          {f.progress < 100 ? (
            <>
              <div className="t-progress-bar">
                <div className="t-progress-fill" style={{ width: `${f.progress}%` }} />
              </div>
              <span className="t-percent">{f.progress}%</span>
            </>
          ) : (
            <button
              className="btn-download"
              onClick={() => downloadFile(f)}
            >
              下載 ↓
            </button>
          )}
          <span className="t-from">來自 {f.fromName}</span>
        </div>
      ))}
    </div>
  );
}

function downloadFile(f) {
  const url = URL.createObjectURL(f.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = f.name;
  a.click();
  URL.revokeObjectURL(url);
}
