import React, { useEffect } from 'react';
import '../css/PreviewModal.css';

export default function PreviewModal({ previewImageUrl, onClose }) {
  // モーダル表示中に背景のスクロールを無効化
  useEffect(() => {
    if (previewImageUrl) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewImageUrl]);

  if (!previewImageUrl) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={previewImageUrl}
          style={{ border: 0, width: '50vw', height: '50vh' }}
          allow="fullscreen"
        ></iframe>
        <button className="close-btn" onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}