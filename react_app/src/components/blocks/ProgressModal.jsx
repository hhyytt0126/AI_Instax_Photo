import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/progressModal.css';
import { convertToViewLink } from '../hooks/useDriveFiles';
import { interruptedProgress } from '../utils/stableDiffusionAPI';
export default function ProgressModal({ imageUrl, visible, onClose, sdApiUrl = 'http://127.0.0.1:7860' }) {
  const [progress, setProgress] = useState(0);
  const [textInfo, setTextInfo] = useState('');
  const [currentImage, setCurrentImage] = useState(null); // 🔹 追加
  const [error, setError] = useState(null);
  const [viewLink, setViewLink] = useState('');
  useEffect(() => {
    setViewLink(convertToViewLink(imageUrl));
    let intervalId;
    async function poll() {
      try {
        const res = await axios.get(`${sdApiUrl}/sdapi/v1/progress`, {
          params: { skip_current_image: false }
        });
        const data = res.data;
        setProgress(data.progress);
        setTextInfo(data.textinfo || '');
        if (data.current_image) {
          setCurrentImage(`data:image/png;base64,${data.current_image}`); // 🔹 Base64画像としてセット
        }
        if (data.progress >= 1) {
          clearInterval(intervalId);
        }
      } catch (e) {
        clearInterval(intervalId);
        setError('進捗取得中にエラーが発生しました');
        console.error(e);
      }
    }

    if (visible) {
      setProgress(0);
      setTextInfo('');
      setCurrentImage(null); // 🔹 初期化
      setError(null);
      poll();
      intervalId = setInterval(poll, 300);
    }
    return () => clearInterval(intervalId);
  }, [visible, sdApiUrl]);

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>生成進捗</h3>
        {error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            <progress max={1} value={progress} className="progress-bar" />
            <div className="text-info">{textInfo} ({(progress * 100).toFixed(1)}%)</div>
            {(
              <>
                <div className="progress-image-container">
                  <iframe
                    src={viewLink}
                    className="progress-preview unified-size"
                    allow="autoplay"
                  ></iframe>
                  <span className="arrow">→</span>
                  <img src={currentImage} alt="" className='progress-preview unified-size'/>
                </div>
                <img src="painter.gif" alt="" className='unified-size'/>
              </>
            )}
          </>
        )}
        <div className="button-group">
          <button className="close-button" onClick={onClose}>閉じる</button>
          <button className="close-button" onClick={
            async () => {
              try {
                await interruptedProgress(sdApiUrl);
              } catch (err) {
                console.error('中断中にエラー:', err);
              }
            }
          }>中断</button>
        </div>
      </div>
    </div>
  );
}