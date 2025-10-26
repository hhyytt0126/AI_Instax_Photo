import React, { useEffect, useState, useRef } from "react";
import generateQRCode from "../utils/generateQRCode";
import uploadPhoto from "../utils/uploadPhoto";
import {
  createDriveSubFolder,
  uploadImageToDrive,
  initializeGapi // 追加！
} from "../utils/googleDriveUtils";

import StitchButton from "../atoms/StitchButton";
import { database } from '../../firebase';
import { ref, push, set } from 'firebase/database';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const PARENT_FOLDER_ID = process.env.REACT_APP_FOLDER_ID;

function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [folderName, setFolderName] = useState(null);
  const tokenClientRef = useRef(null); // useStateからuseRefに変更
  const [photoDataUrl, setPhotoDataUrl] = useState(null); // 写真データ保持用
  const [isUploading, setIsUploading] = useState(false); // アップロード中か
  const [photoCount, setPhotoCount] = useState(1); // 人数選択用

  useEffect(() => {
    // Google Identity Services クライアントを初期化
    if (window.google && !tokenClientRef.current) { // .currentでアクセス
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            setAccessToken(tokenResponse.access_token);
            console.log("✅ Googleログイン成功");
          }
        },
      });
      tokenClientRef.current = client; // refに格納
    }
  }, []);

  const handleLogin = () => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    }
  };

  const startCamera = async () => {
    setShowCameraModal(true);
    const isPC = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isPC) {
      // PC用の高解像度設定
      const pcConstraints = {
        video: {
          width: { ideal: 1440 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: false
      };
      try {
        const stream = await navigator.mediaDevices.getUserMedia(pcConstraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("PCカメラの起動に失敗しました:", err);
        alert("カメラの起動に失敗しました。ブラウザのカメラアクセス許可を確認してください。");
        setShowCameraModal(false);
      }
    } else {
      // モバイル用のシンプルな設定
      const mobileConstraints = {
        video: { facingMode: { ideal: "environment" } }, // まずはアウトカメラを試す
        audio: false
      };
      try {
        let stream = await navigator.mediaDevices.getUserMedia(mobileConstraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (fallbackErr) {
        console.warn("アウトカメラでの起動に失敗。インカメラを試します:", fallbackErr);
        // アウトカメラが失敗した場合、インカメラで再試行
        const frontCameraConstraints = {
          video: { facingMode: "user" },
          audio: false
        };
        try {
          let stream = await navigator.mediaDevices.getUserMedia(frontCameraConstraints);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (finalErr) {
          console.error("カメラの起動に失敗しました:", finalErr);
          alert("カメラの起動に失敗しました。ブラウザのカメラアクセス許可を確認してください。");
          setShowCameraModal(false);
        }
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImagePreviewUrl(dataUrl);
      setPhotoDataUrl(dataUrl);
      setFolderName(null);
      stopCamera();
    }
  };

  const handleTakePhoto = () => {
    if (!accessToken) {
      alert("先にGoogleログインしてください。");
      return;
    }
    const isPC = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isPC) {
      // PCの場合はモーダルカメラを起動
      startCamera();
    } else {
      // スマホの場合はOS標準のファイル選択/カメラを起動
      uploadPhoto((dataUrl) => {
        setImagePreviewUrl(dataUrl);
        setPhotoDataUrl(dataUrl);
        setFolderName(null); // 前回のフォルダ名リセット
      });
    }
  };

  const sendNotification = async (folderId, folderName, photoCount) => {
    try {
      const notificationsRef = ref(database, 'notifications');
      const newNotificationRef = push(notificationsRef);

      await set(newNotificationRef, {
        type: 'new_folder',
        folderId: folderId,
        folderName: folderName,
        photoCount: photoCount,
        timestamp: Date.now(),
        completed: false,
        read: false
      });

      console.log('通知送信成功:', { folderName, photoCount });
    } catch (error) {
      console.error('通知送信エラー:', error);
    }
  };

  const handleUpload = async () => {
    if (!photoDataUrl || !accessToken) return;
    console.log('📸 選択された人数:', photoCount);
    try {
      setIsUploading(true);
      await initializeGapi();
      window.gapi.client.setToken({ access_token: accessToken });

      const newFolderName = `${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}${Math.floor(Math.random() * 90 + 10)}`;
      const subFolderId = await createDriveSubFolder(PARENT_FOLDER_ID, newFolderName, accessToken);

      await uploadImageToDrive(subFolderId, photoDataUrl, accessToken, "Realphoto");

      const qr = await generateQRCode(subFolderId);
      await uploadImageToDrive(subFolderId, qr, accessToken, "qr");

      await sendNotification(subFolderId, newFolderName, photoCount);

      setFolderName(newFolderName);
    } catch (err) {
      console.error("アップロードエラー:", err);
      alert("アップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="w-full flex flex-col items-center">
        <h1 className="text-center text-xl font-bold m-8">写真をアップロードしてね！</h1>

        {!accessToken ? (
          <StitchButton onClick={handleLogin}>Googleにログイン</StitchButton>
        ) : (
          <StitchButton onClick={handleTakePhoto} disabled={isUploading}>写真を撮る</StitchButton>
        )}

        <div className="flex justify-center w-full m-6">
          <div className="flex justify-center items-center w-[500px] h-[500px] border-2 border-dashed border-gray-400 p-2">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="preview"
                className="max-w-[300px] w-full h-auto"
              />
            )}
          </div>
        </div>

        {photoDataUrl && !folderName && (
          <>
            <div className="mb-4 w-full max-w-md">
              <label className="block text-sm font-bold mb-2">人数を選択：</label>
              <select
                value={photoCount}
                onChange={(e) => setPhotoCount(Number(e.target.value))}
                className="border rounded px-4 py-2 w-full"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num}枚</option>
                ))}
              </select>
            </div>
            <StitchButton onClick={handleUpload} disabled={isUploading} className="mt-5 p-8">
              アップロード
            </StitchButton>
          </>
        )}

        {isUploading && (
          <div id="fullOverlay" className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
            <div className="text-center mt-5">
              <div className="spinner-container">
                <div className="spinner-flip">
                  <div className="spinner-face spinner-front">
                    <img src="ai-cheki.jpg" alt="Front" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <div className="spinner-face spinner-back">
                    <img src="real.jpg" alt="Back" className="w-full h-full object-cover rounded-xl" />
                  </div>
                </div>
                <p className="mt-2 text-white text-xl font-semibold">アップロード中...</p>
              </div>
            </div>
          </div>
        )}

        {folderName && (
          <p className="flex justify-center mt-5 font-bold">
            あなたの待ち受け番号は <span className="text-blue-600 ml-2">{folderName}</span> です
          </p>
        )}
      </div>
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
          <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl h-auto rounded-lg"></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="flex gap-4 mt-4">
            <StitchButton onClick={capturePhoto}>
              撮影
            </StitchButton>
            <button
              onClick={stopCamera}
              className="px-4 py-2 rounded-lg bg-gray-600 text-white font-bold"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Camera;
