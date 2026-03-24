import React from 'react';

// Wrapper for ad placements. Children can be replaced with AdSense scripts.
export default function AdZone({ id, width, height, label, className = '' }) {
  return (
    <div
      id={id}
      className={`ad-zone ${className}`}
      style={{
        width: width || '100%',
        minHeight: height || 90,
        background: '#f0f0f0',
        border: '1px dashed #ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aaa',
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {/* Replace this div content with your ad script */}
      <span>{label || `Ad Zone [${id}]`}</span>
    </div>
  );
}
