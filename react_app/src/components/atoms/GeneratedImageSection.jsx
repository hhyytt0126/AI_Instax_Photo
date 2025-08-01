import React from 'react';

export default function GeneratedImageSection({ generatedImageUrl, onUpload, uploading }) {
  if (!generatedImageUrl) return null;

  return (
    <div className="generated-image-section">
      <h3>生成画像</h3>
      <img src={generatedImageUrl} alt="生成画像" style={{ maxWidth: '300px' }} />
      <button onClick={onUpload} disabled={uploading}>
        {uploading ? 'アップロード中...' : 'アップロード'}
      </button>
    </div>
  );
}
