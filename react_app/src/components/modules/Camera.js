import React, { useEffect, useState } from "react";
import uploadPhoto from "../utils/uploadPhoto";
import generateQRCode from "../utils/generateQRCode";
import { createDriveSubFolder, uploadImageToDrive } from "../utils/googleDriveUtils";
import StitchButton from "../atoms/StitchButton";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const PARENT_FOLDER_ID = process.env.REACT_APP_FOLDER_ID;

function Camera() {
  const [accessToken, setAccessToken] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  const [tokenClient, setTokenClient] = useState(null);

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

    uploadPhoto(async (dataUrl) => {
      setImagePreviewUrl(dataUrl);

      try {
        const newFolderName = `Upload_${Date.now()}`;
        const subFolderId = await createDriveSubFolder(PARENT_FOLDER_ID, newFolderName, accessToken);
        await uploadImageToDrive(subFolderId, dataUrl, accessToken);
        const qr = await generateQRCode(subFolderId);
        setQrCodeUrl(qr);
      } catch (err) {
        console.error("アップロードエラー:", err);
        alert("アップロードに失敗しました");
      }
    });
  };

  return (
    <div>
      <h1>写真をアップロードしてね！</h1>

      {!accessToken ? (
        <StitchButton onClick={handleLogin}>Googleにログイン</StitchButton>
      ) : (
        <StitchButton onClick={handleTakePhoto}>写真を撮る</StitchButton>
      )}

      {imagePreviewUrl && (
        <img src={imagePreviewUrl} alt="preview" style={{ maxWidth: "100%", marginTop: "20px" }} />
      )}
      {qrCodeUrl && (
        <img src={qrCodeUrl} alt="QR Code" style={{ maxWidth: "200px", marginTop: "20px" }} />
      )}
    </div>
  );
}

export default Camera;
