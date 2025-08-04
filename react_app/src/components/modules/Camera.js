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
    <div>
      <h1 style={{textAlign: "center"}}>写真をアップロードしてね！</h1>

      {!accessToken ? (
        <StitchButton onClick={handleLogin}>Googleにログイン</StitchButton>
      ) : (
        <StitchButton onClick={handleTakePhoto} disabled={isUploading}>写真を撮る</StitchButton>
      )}

      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "30vw",
            height: "500px",
            border: "2px dashed gray",
            padding: "10px",
          }}
        >
          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt="preview"
              style={{ maxWidth: "300px", width: "100%", height: "auto" }}
            />
          )}
        </div>
      </div>

      {photoDataUrl && !folderName && (
        <StitchButton onClick={handleUpload} disabled={isUploading} style={{ marginTop: "20px" }}>
          アップロード
        </StitchButton>
      )}
      {isUploading && (
        <div id="fullOverlay">
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <div className="spinner-container">
              <div className="spinner-flip">
                <div className="spinner-face spinner-front">
                  <img src="ai-cheki.jpg" alt="Front" />
                </div>
                <div className="spinner-face spinner-back">
                  <img src="real.jpg" alt="Back" />
                </div>
                
            </div>
            <p style={{ marginTop: "10px", color: "white", fontSize: "1.5rem" }}>アップロード中...</p>
          </div>
          
        </div>
        </div>

      )}


      {folderName && (
        <p style={{ display: "flex", justifyContent: "center", marginTop: "20px", fontWeight: "bold" }}>
          あなたの待ち受け番号は <span style={{ color: "#0070f3" }}>{folderName}</span> です
        </p>
      )}
    </div>
  );
}

export default Camera;
