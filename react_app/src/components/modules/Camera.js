import React, { useEffect, useState } from "react";
import uploadPhoto from "../utils/uploadPhoto";
import generateQRCode from "../utils/generateQRCode";
import {
  createDriveSubFolder,
  uploadImageToDrive,
  initializeGapi // 追加！
} from "../utils/googleDriveUtils";

import StitchButton from "../atoms/StitchButton";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const PARENT_FOLDER_ID = process.env.REACT_APP_FOLDER_ID;

function Camera() {
  const [accessToken, setAccessToken] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [folderName, setFolderName] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null); // 写真データ保持用
  const [isUploading, setIsUploading] = useState(false); // アップロード中か
  const [photoCount, setPhotoCount] = useState(1); // 写真枚数選択用

  useEffect(() => {
    // Google Identity Services クライアントを初期化
    if (window.google && !tokenClient) {
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
      setTokenClient(client);
    }
  }, [tokenClient]);

  const handleLogin = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  const handleTakePhoto = () => {
    if (!accessToken) {
      alert("先にGoogleログインしてください。");
      return;
    }

    uploadPhoto((dataUrl) => {
      setImagePreviewUrl(dataUrl);
      setPhotoDataUrl(dataUrl);
      setFolderName(null); // 前回のフォルダ名リセット
    });
  };

  const handleUpload = async () => {
    if (!photoDataUrl || !accessToken) return;
    try {
      setIsUploading(true);
      await initializeGapi();
      window.gapi.client.setToken({ access_token: accessToken });

      const newFolderName = `${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}${Math.floor(Math.random() * 90 + 10)}`;
      const subFolderId = await createDriveSubFolder(PARENT_FOLDER_ID, newFolderName, accessToken);

      await uploadImageToDrive(subFolderId, photoDataUrl, accessToken, "Realphoto");

      const qr = await generateQRCode(subFolderId);
      await uploadImageToDrive(subFolderId, qr, accessToken, "qr");

      setFolderName(newFolderName);
    } catch (err) {
      console.error("アップロードエラー:", err);
      alert("アップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  return (
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
            <label className="block text-sm font-bold mb-2">写真枚数を選択：</label>
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
  );
}

export default Camera;
