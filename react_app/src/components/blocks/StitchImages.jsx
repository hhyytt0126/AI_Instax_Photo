import React, { useRef, useState } from 'react';

const StitchImages = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const fileInputRef = useRef();

  // 画像選択時
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // チェキフォーマットに変換
  const handleConvert = () => {
    if (!selectedImage) return;
    const img = new window.Image();
    img.src = selectedImage;
    img.onload = () => {
      // チェキ風サイズ例（横2枚並べる）
      const width = img.width * 2;
      const height = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      // 左右に同じ画像を描画
      ctx.drawImage(img, 0, 0, img.width, img.height);
      ctx.drawImage(img, img.width, 0, img.width, img.height);
      setResultImage(canvas.toDataURL('image/png'));
    };
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 32 }}>
      <h2>チェキ画像生成</h2>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} />
      <br /><br />
      <button onClick={handleConvert} disabled={!selectedImage}>
        チェキフォーマットに変換
      </button>
      <br /><br />
      {selectedImage && (
        <div>
          <span>選択画像プレビュー:</span><br />
          <img src={selectedImage} alt="選択画像" style={{ maxWidth: 200, border: '1px solid #ccc' }} />
        </div>
      )}
      <br />
      {resultImage && (
        <div>
          <span>生成画像プレビュー:</span><br />
          <img src={resultImage} alt="生成画像" style={{ maxWidth: 400, border: '2px solid #333' }} />
          <br />
          <a href={resultImage} download="cheki.png">画像をダウンロード</a>
        </div>
      )}
    </div>
  );
};

export default StitchImages;
