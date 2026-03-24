import React, { useRef, useState } from 'react';

export default function DropZone({ selectedClient, files, onFilesAdded, onSend, onClearFiles }) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) onFilesAdded(dropped);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleFileInput = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length) onFilesAdded(selected);
    e.target.value = '';
  };

  return (
    <div
      className={`drop-zone ${dragging ? 'dragging' : ''} ${!selectedClient ? 'disabled' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {!selectedClient ? (
        <div className="drop-hint">
          <span className="drop-icon">↑</span>
          <p>請先從左側選擇目標裝置</p>
        </div>
      ) : files.length === 0 ? (
        <div className="drop-hint" onClick={() => fileInputRef.current.click()}>
          <span className="drop-icon">📁</span>
          <p>拖曳檔案到這裡</p>
          <p className="drop-sub">或點擊選擇檔案（不限大小與類型）</p>
        </div>
      ) : (
        <div className="drop-ready">
          <div className="drop-file-list">
            {files.map((f, i) => (
              <div key={i} className="drop-file-item">
                <span className="file-icon">📄</span>
                <span className="file-name">{f.name}</span>
                <span className="file-size">{formatSize(f.size)}</span>
              </div>
            ))}
          </div>
          <div className="drop-actions">
            <span className="drop-target">
              目標：<strong>{selectedClient.displayName}</strong>
            </span>
            <button className="btn-clear" onClick={onClearFiles}>清除</button>
            <button className="btn-send" onClick={onSend}>
              開始傳輸 ({files.length} 個檔案)
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
