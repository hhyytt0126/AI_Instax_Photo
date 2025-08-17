import React, { useRef, useState } from 'react';

const StitchImages = () => {
  const [selectedImages, setSelectedImages] = useState([null, null]);
  const [resultImages, setResultImages] = useState([null, null]);
  const fileInputRefs = [useRef(), useRef()];

  // 画像選択時
  const handleFileChange = (e, idx) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedImages(prev => {
          const next = [...prev];
          next[idx] = ev.target.result;
          return next;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // チェキフォーマットに変換
  const handleConvert = () => {
    if (!selectedImages[0] || !selectedImages[1]) return;
    // 画像A→C, 画像B→D
    const imgA = new window.Image();
    const imgB = new window.Image();
    let loaded = 0;
    const results = [null, null];

    // チェキ風サイズ計算例（余白付き、比率調整）
    const makeChekiFormat = (img, type) => {
      // 元画像サイズ
      const iw = img.width;
      const ih = img.height;
      let outW, outH, pasteX1, pasteY, pasteX2, bandW;
      if (type === 'A') {
        // imgA用の処理
        outW = Math.round(iw * 127 / 46);
        outH = Math.round(ih * 89 * 3 / 184);
        pasteX1 = Math.round(iw * 4 / 46);
        pasteY = Math.round(ih * 7 / 46);
        pasteX2 = Math.round(iw * 58 / 46);
        bandW = Math.round(outW * 19 / 127); // 帯の幅
      } else {
        // imgB用の処理（例: 余白や配置を少し変える）
        outW = Math.round(iw * 127 / 46);
        outH = Math.round(ih * 89 * 3 / 184);
        pasteX1 = Math.round(iw * 21.5 / 46);
        pasteY = Math.round(ih * 7 / 46);
        pasteX2 = Math.round(iw * 75.5 / 46);
      }
      // 背景（白）
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, outW, outH);
      // 右端にカラー帯（例: ピンク）
      ctx.fillStyle = 'rgb(238,112,133)';
      ctx.fillRect(outW - bandW, 0, bandW, outH);
      // 左右に画像を配置
      ctx.drawImage(img, pasteX1, pasteY, iw, ih);
      ctx.drawImage(img, pasteX2, pasteY, iw, ih);
      return canvas.toDataURL('image/png');
    };

    const onLoad = () => {
      loaded++;
      if (loaded === 2) {
        results[0] = makeChekiFormat(imgA, 'A'); // C
        results[1] = makeChekiFormat(imgB, 'B'); // D
        setResultImages(results);
      }
    };
    imgA.onload = onLoad;
    imgB.onload = onLoad;
    imgA.src = selectedImages[0];
    imgB.src = selectedImages[1];
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 32 }}>
      <h2>チェキ画像生成（2枚横並び）</h2>
      <div>
        <input type="file" accept="image/*" ref={fileInputRefs[0]} onChange={e => handleFileChange(e, 0)} />
        <input type="file" accept="image/*" ref={fileInputRefs[1]} onChange={e => handleFileChange(e, 1)} style={{ marginLeft: 16 }} />
      </div>
      <br />
      <button onClick={handleConvert} disabled={!selectedImages[0] || !selectedImages[1]}>
        チェキフォーマットに変換
      </button>
      <br /><br />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        {selectedImages[0] && (
          <div>
            <span>画像1プレビュー:</span><br />
            <img src={selectedImages[0]} alt="画像1" style={{ maxWidth: 150, border: '1px solid #ccc' }} />
          </div>
        )}
        {selectedImages[1] && (
          <div>
            <span>画像2プレビュー:</span><br />
            <img src={selectedImages[1]} alt="画像2" style={{ maxWidth: 150, border: '1px solid #ccc' }} />
          </div>
        )}
      </div>
      <br />
      {(resultImages[0] || resultImages[1]) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          {resultImages[0] && (
            <div>
              <span>画像C（Aを横2枚）:</span><br />
              <img src={resultImages[0]} alt="画像C" style={{ maxWidth: 200, border: '2px solid #333' }} />
              <br />
              <a href={resultImages[0]} download="cheki_C.png">画像Cダウンロード</a>
            </div>
          )}
          {resultImages[1] && (
            <div>
              <span>画像D（Bを横2枚）:</span><br />
              <img src={resultImages[1]} alt="画像D" style={{ maxWidth: 200, border: '2px solid #333' }} />
              <br />
              <a href={resultImages[1]} download="cheki_D.png">画像Dダウンロード</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StitchImages;
