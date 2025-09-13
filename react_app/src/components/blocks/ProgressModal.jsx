import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/progressModal.css'
import { getDriveFileId, fetchDriveImageBlobUrl} from '../hooks/useDriveFiles';
import { interruptedProgress } from '../utils/stableDiffusionAPI';
import { access_token } from '../hooks/useGoogleAuth';
export default function ProgressModal({ imageUrl, visible, onClose, sdApiUrl = 'http://127.0.0.1:7860' }) {
  const [progress, setProgress] = useState(0);
  const [textInfo, setTextInfo] = useState('');
  const [currentImage, setCurrentImage] = useState(null); // 🔹 追加
  const [error, setError] = useState(null);
  const [viewLink, setViewLink] = useState('');
  useEffect(() => {
    getDriveFileId(imageUrl).then(fileId => {
      if (fileId) {
        fetchDriveImageBlobUrl(fileId, access_token).then(blobUrl => {
          setViewLink(blobUrl) ;
        });
      }
    });
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
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 text-center">生成進捗</h3>
        {error ? (
          <div className="text-red-600 text-center mb-4">{error}</div>
        ) : (
          <>
            <div className="w-full h-4 bg-gray-200 rounded mb-2 overflow-hidden">
              <div className="h-4 bg-blue-500 transition-all" style={{width: `${progress*100}%`}}></div>
            </div>
            <div className="text-sm text-gray-700 text-center mb-2">{textInfo} <span className="font-semibold">({(progress * 100).toFixed(1)}%)</span></div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <img
                src={viewLink}
                className="rounded border w-24 h-24 bg-gray-100 object-contain object-center"
                alt="Drive Preview"
              />
              <span className="text-2xl text-center">→</span>
              <img src={currentImage} alt="生成中" className='rounded border w-24 h-24 bg-gray-100 object-contain object-center'/>
            </div>
            <div className="flex justify-center mb-2">
              <img src="painter.gif" alt="Loading" className='w-16 h-16'/>
            </div>
          </>
        )}
        <div className="flex gap-3 justify-center mt-4">
          <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold" onClick={onClose}>閉じる</button>
          <button className="px-4 py-2 rounded bg-red-200 hover:bg-red-300 text-red-800 font-semibold" onClick={
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