import React, { useState } from "react";
import StitchButton from "../atoms/StitchButton";
import uploadPhoto from "../utils/uploadPhoto";

function Camera() {
  // 選択された画像のプレビューURLを保持するためのstate
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const handleTakePhoto = () => {
    // uploadPhotoを呼び出す際に、画像が選択された後の処理を渡す
    uploadPhoto((dataUrl) => {
      // uploadPhoto.jsから受け取ったデータURLをstateにセットする
      setImagePreviewUrl(dataUrl);
    });
  };

  return (
    <div>
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>写真をアップロードしてね！</h1>
      <StitchButton onClick={handleTakePhoto}>写真を撮る</StitchButton>

      {/* imagePreviewUrlが存在する場合にのみ、画像とプレビュータイトルを表示する */}
      {imagePreviewUrl && (
        <div style={{ marginTop: '20px' }}>
          <h3>プレビュー</h3>
          <img
            src={imagePreviewUrl}
            alt="選択された画像のプレビュー"
            style={{ maxWidth: '100%', height: 'auto', maxHeight: '400px' }}
          />
        </div>
      )}
    </div>
  );
}

export default Camera;