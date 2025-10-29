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
  const [stream, setStream] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [folderName, setFolderName] = useState(null);
  const tokenClientRef = useRef(null); // useStateからuseRefに変更
  const [photoDataUrl, setPhotoDataUrl] = useState(null); // 写真データ保持用
  const [isUploading, setIsUploading] = useState(false); // アップロード中か
  const [photoCount, setPhotoCount] = useState(1); // 人数選択用
  const [countdown, setCountdown] = useState(null); // PC撮影時のカウントダウン用
  const [showFlash, setShowFlash] = useState(false); // PC撮影時のフラッシュ用
  const [showLargePreview, setShowLargePreview] = useState(false); // PC撮影後のプレビュー表示用
  const [showCountdownEffect, setShowCountdownEffect] = useState(false); // カウントダウン中のエフェクト用
  const shutterSoundRef = useRef(null); // シャッター音用のref
  const countSoundRef = useRef(null); // カウントダウン音用のref
  const countdown54321SoundRef = useRef(null); // 54321カウントダウン音用のref
  const [aspectRatio, setAspectRatio] = useState('4:3'); // アスペクト比の状態

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
    // シャッター音をプリロード
    shutterSoundRef.current = new Audio('/shutter.mp3');
    shutterSoundRef.current.load(); // 念のためプリロードを明示
    // カウントダウン音をプリロード
    countSoundRef.current = new Audio('/count.mp3');
    countSoundRef.current.load();
    // 54321カウントダウン音をプリロード
    countdown54321SoundRef.current = new Audio('/54321.mp3');
    countdown54321SoundRef.current.load();
  }, []);

  // カウントダウンに合わせて白いエフェクトと音を制御する
  useEffect(() => {
    // カウントダウンが開始され、0より大きい場合
    if (countdown !== null && countdown > 0) {
      setShowCountdownEffect(true); // エフェクトを表示

      // カウント音を再生
      if (countSoundRef.current) {
        countSoundRef.current.currentTime = 0;
        countSoundRef.current.play().catch(e => console.error("カウントダウン音の再生に失敗:", e));
      }

      // 150ミリ秒後にエフェクトを非表示にする
      const timer = setTimeout(() => {
        setShowCountdownEffect(false);
      }, 150);

      return () => clearTimeout(timer); // クリーンアップ
    }
  }, [countdown]);

  // アスペクト比の変更を監視してカメラを再起動
  useEffect(() => {
      // カメラモーダルが表示されている場合のみ再起動する
      if (showCameraModal) {
          startCamera();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectRatio]);

  const handleLogin = () => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    }
  };

  const startCamera = async () => {
    setShowCameraModal(true);
    // 既存のストリームがあれば停止
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    const videoConstraints = aspectRatio === '4:3'
      ? { width: { ideal: 1440 }, height: { ideal: 1080 } }
      : { width: { ideal: 810 }, height: { ideal: 1080 } };

    // facingModeを 'user' (インカメラ) に固定
    const constraints = {
      video: {
        ...videoConstraints,
        facingMode: 'user'
      },
      audio: false
    };
    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
    } catch (err) {
      console.error("カメラの起動に失敗:", err);
      alert("カメラの起動に失敗しました。ブラウザのカメラアクセス許可を確認してください。");
      setShowCameraModal(false);
    }
  };

  // アスペクト比を切り替えてカメラを再起動
  const handleToggleAspectRatio = () => {
    setAspectRatio(prev => (prev === '4:3' ? '3:4' : '4:3'));
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCountdown(null); // カウントダウンをリセット
    setShowFlash(false); // フラッシュを非表示に
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      // シャッター音を再生
      if (shutterSoundRef.current) {
        shutterSoundRef.current.currentTime = 0; // 再生位置を最初に戻す
        shutterSoundRef.current.play().catch(e => console.error("シャッター音の再生に失敗:", e));
      }

      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImagePreviewUrl(dataUrl);
      setPhotoDataUrl(dataUrl);
      setFolderName(null);
      // PCの場合、大きなプレビューを表示する
      const isPC = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isPC) {
        setShowLargePreview(true);
        setShowFlash(false); // フラッシュを非表示にする
      } else stopCamera();
    }
  };

  const handleStartCountdown = () => {
    if (countdown !== null) return; // カウントダウン中は実行しない

    let count = 5;
    setCountdown(count);

    // 5のタイミングで一度だけ音を鳴らす
    if (countdown54321SoundRef.current) {
      countdown54321SoundRef.current.currentTime = 0;
      countdown54321SoundRef.current.play().catch(e => console.error("54321カウントダウン音の再生に失敗:", e));
    }

    const intervalId = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(intervalId);
        // フラッシュを焚いてから撮影
        setShowFlash(true);
        // DOMの更新を待ってから撮影するために少し遅延させる
        setTimeout(() => {
          capturePhoto();
        }, 100);
      }
    }, 1000);
  };

  const handleUsePhoto = () => {
    setShowLargePreview(false);
    stopCamera();
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
        read: false,
        purchased: false
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

      const raw = `${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}${Math.floor(Math.random() * 90 + 10)}`;
      const newFolderName = `${raw.slice(0, 4)}-${raw.slice(4)}`;
      const subFolderId = await createDriveSubFolder(PARENT_FOLDER_ID, newFolderName, accessToken);

      await uploadImageToDrive(subFolderId, photoDataUrl, accessToken, "Realphoto");

      const qr = await generateQRCode(subFolderId);
      await uploadImageToDrive(subFolderId, qr, accessToken, "qr");

      if (newFolderName) {
        await sendNotification(subFolderId, newFolderName, photoCount);
      }

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
                className="max-w-full max-h-full object-contain"
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
          <p className="flex flex-col items-center mt-5 mb-5 font-bold text-3xl">
            受付番号
            <span className="text-blue-600 text-6xl mt-2">{folderName}</span>
          </p>
        )}
      </div>
      {showCameraModal && (
        <div className="fixed inset-0 bg-black z-50">
          {showLargePreview ? (
            <>
              <img src={imagePreviewUrl} alt="Captured" className="w-full h-full object-contain" />
              <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
                <StitchButton onClick={handleUsePhoto}>OK</StitchButton>
              </div>
            </>
          ) : (
            <>
              <video
                ref={el => {
                  videoRef.current = el; // videoRefは引き続き保持
                  if (el && stream) {
                    el.srcObject = stream;
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-contain transform -scale-x-100"></video>

              {/* カメラ注目用のインジケーター */}
              {countdown !== null && countdown > 0 && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center flex-col pointer-events-none">
                  <div className="text-red-500 text-8xl animate-pulse">▲</div>
                </div>
              )}

              {/* カウントダウン中の白い靄エフェクト */}
              {showCountdownEffect && (
                <div className="absolute inset-0 bg-white opacity-30">
                </div>
              )}

              {/* フラッシュ用のオーバーレイ */}
              {showFlash && (
                <div className="absolute inset-0 bg-white z-10"></div>
              )}

              {/* カウントダウン表示 */}
              {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-between px-16 pointer-events-none">
                  <span className="text-white text-[60vh] font-bold leading-none" style={{ textShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
                    {countdown}
                  </span>
                  <span className="text-white text-[60vh] font-bold leading-none" style={{ textShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
                    {countdown}
                  </span>
                </div>
              )}

              {/* 操作ボタン */}
              <div className="absolute bottom-10 left-0 right-0 flex justify-start items-center gap-8 pl-10">
                <StitchButton onClick={handleStartCountdown} disabled={countdown !== null}>
                  撮影
                </StitchButton>
                <button
                  onClick={stopCamera}
                  disabled={countdown !== null}
                  className="px-6 py-3 rounded-lg bg-gray-600 bg-opacity-80 text-white font-bold text-lg disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleToggleAspectRatio}
                  disabled={countdown !== null}
                  className="px-6 py-3 rounded-lg bg-blue-600 bg-opacity-80 text-white font-bold text-lg disabled:opacity-50"
                >
                  {aspectRatio === '4:3' ? '縦長に変更' : '横長に変更'}
                </button>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
      )}
    </>
  );
}

export default Camera;
