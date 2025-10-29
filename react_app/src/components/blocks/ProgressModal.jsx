import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/progressModal.css'
import { getDriveFileId, fetchDriveImageBlobUrl } from '../hooks/useDriveFiles';
import { interruptedProgress } from '../utils/stableDiffusionAPI';
import { access_token } from '../hooks/useGoogleAuth';
export default function ProgressModal({ imageUrl, visible, onClose, sdApiUrl = 'http://127.0.0.1:7860' }) {
  const [progress, setProgress] = useState(0);
  const [textInfo, setTextInfo] = useState('');
  const [currentImage, setCurrentImage] = useState(null); // 🔹 追加
  const [error, setError] = useState(null);
  const [viewLink, setViewLink] = useState('');
  const [waitImage, setWaitImage] = useState("wait_image.png");
  const handleViewLoad = (e) => {
    const img = e.target;
    const { naturalWidth, naturalHeight } = img;

    // 横長なら wide_wait_image, 縦長なら wait_image
    if (naturalWidth > naturalHeight) {
      setWaitImage("wide_wait_image.png");
    } else {
      setWaitImage("wait_image.png");
    }
  };

  useEffect(() => {
    getDriveFileId(imageUrl).then(fileId => {
      if (fileId) {
        fetchDriveImageBlobUrl(fileId, access_token).then(blobUrl => {
          setViewLink(blobUrl);
        });
      }
    });
    let intervalId;
    async function poll() {
      try {
        const res = await axios.default.get(`${sdApiUrl}/sdapi/v1/progress`, {
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

  // Prevent closing modal by clicking outside, pressing back, or pressing Escape while visible
  useEffect(() => {
    if (!visible) return;

    // Disable Escape key default behavior while modal is open
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);

    // Push a dummy history state to block back navigation, and intercept popstate to re-push
    let addedHistory = false;
    const blockBack = () => {
      try {
        window.history.pushState({ progressModal: true }, '');
        addedHistory = true;
      } catch (err) {
        // ignore
      }
    };
    blockBack();

    const onPop = (e) => {
      // Re-push to prevent leaving the page while progress modal is visible
      try {
        window.history.pushState({ progressModal: true }, '');
      } catch (err) { }
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('popstate', onPop);
      // remove the dummy history entry if we added one
      if (addedHistory) {
        try {
          window.history.back();
        } catch (err) { }
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={(e) => e.stopPropagation()}>
      <div className="progress-modal-content bg-white rounded-3xl shadow-2xl p-10 w-full relative" onClick={e => e.stopPropagation()} style={{ maxWidth: '1600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 className="text-3xl font-bold mb-6 text-center">生成進捗</h3>
        {error ? (
          <div className="text-red-600 text-center mb-4">{error}</div>
        ) : (
          <>
            <div className="w-full h-6 bg-gray-200 rounded mb-4 overflow-hidden">
              <div className="h-6 bg-blue-700 transition-all" style={{ width: `${progress * 100}%` }}></div>
            </div>
            <div className="text-lg text-gray-700 text-center mb-4">{textInfo} <span className="font-semibold">({(progress * 100).toFixed(1)}%)</span></div>
            <div className="grid [grid-template-columns:auto_100px_auto] items-center justify-items-center mb-8">
              <img
                src={viewLink}
                onLoad={handleViewLoad}
                className="progress-image rounded border bg-gray-100 object-contain object-center"
                alt="Drive Preview"
              />

              <img src="arrow.gif" alt="Loading" className="w-36 h-36" />

              <img
                src={currentImage ? currentImage : waitImage}
                alt="生成中"
                className="progress-image rounded border bg-gray-100 object-contain object-center"
              />
            </div>
            <div className="flex justify-center mb-6">
              <img src="painter.gif" alt="Loading" className='w-28 h-28' />
            </div>
          </>
        )}
        <div className="flex gap-4 justify-center mt-6">
          <button className="px-6 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-lg" onClick={onClose}>閉じる</button>
          <button className="px-6 py-3 rounded-lg bg-red-200 hover:bg-red-300 text-red-800 font-semibold text-lg" onClick={
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