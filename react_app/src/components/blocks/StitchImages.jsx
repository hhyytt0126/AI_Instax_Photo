import React, { useEffect, useState } from 'react';
import { uploadBlobToDrive, access_token } from '../hooks/useDriveFiles';
import logoSrc from '../../logo.svg';
import { fetchFileById } from "../hooks/useDriveFiles";
export default function StitchImages({ imageUrls, parentFolderId, parentFolderName, onUploadComplete, setExpandedFolders, setSubfolderContents }) {
  // 2枚の生成画像とアップロード状態を管理
  const [generatedImages, setGeneratedImages] = useState({ real: null, ai: null });
  // setSubfolderContentsをpropsで受け取れるように
  // ...existing code...
  // setSubfolderContentsをpropsで受け取る
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    const images = []; // imagesをuseEffectスコープに移動

    if (!imageUrls || imageUrls.length < 3) return;
    if (Object.values(generatedImages).every(img => img !== null)) return; // 既に生成済みなら再実行しない

    // フォント読み込み後に画像処理を開始
    const logoImage = new Image();
    let loadedImages = 0;
    const totalImagesToLoad = imageUrls.length + 1; // 3枚の画像 + ロゴ

    // 画像を読み込む
    imageUrls.forEach((url, index) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // CORSエラーを回避
      img.src = url;
      images[index] = img;
      img.onload = () => {
        loadedImages++;
        if (loadedImages === totalImagesToLoad) {
          // すべての画像が読み込まれたら描画
          drawImages(logoImage);
        }
      };
      img.onerror = () => console.error(`画像の読み込みに失敗しました: ${url}`);
    });

    // ロゴ画像を読み込む
    logoImage.src = logoSrc;
    logoImage.onload = () => {
      loadedImages++;
      if (loadedImages === totalImagesToLoad) {
        drawImages(logoImage);
      }
    };
    logoImage.onerror = () => console.error('ロゴの読み込みに失敗しました。');

    const drawImages = (logo) => {
      // 画像をwidthの降順（大きい順）にソート
      const sortedImages = [...images].sort((a, b) => b.width - a.width);
      let realImage = sortedImages[0];
      let aiImage = sortedImages[1];
      const qrCode = sortedImages[2]; // 3番目の画像をQRコードとして扱う

      if (!realImage || !aiImage || !qrCode) {
        console.error("画像が見つかりませんでした。");
        return;
      }

      // 横長画像を回転させる関数
      const rotateImage = (img, direction = 'clockwise') => {
        const canvas = document.createElement('canvas');
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext('2d');

        const angle = direction === 'clockwise' ? 90 : -90;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotatedImg = new Image();
        rotatedImg.src = canvas.toDataURL();
        rotatedImg.width = canvas.width;
        rotatedImg.height = canvas.height;
        return rotatedImg;
      };

      // チェキ風画像を生成するヘルパー関数
      const makeChekiFormat = (img, type, textToWrite) => {
        const isLandscape = img.width > img.height;
        // 横長画像の場合はtypeに応じて回転、そうでなければそのまま
        const sourceImg = isLandscape
          ? rotateImage(img, type === 'ai' ? 'counter-clockwise' : 'clockwise')
          : img;
        const iw = sourceImg.width;
        const ih = sourceImg.height;
        let outW, outH, pasteX1, pasteY, pasteX2, bandW;

        if (type === 'real') {
          // realImage用の処理
          outW = Math.round(iw * 127 / 46);
          outH = Math.round(ih * 89 * 3 / 184);
          pasteX1 = Math.round(iw * 21.5 / 46);
          pasteY = Math.round(ih * 7 / 46);
          pasteX2 = Math.round(iw * 75.5 / 46);
        } else {
          // aiImage用の処理
          outW = Math.round(iw * 127 / 46);
          outH = Math.round(ih * 89 * 3 / 184);
          pasteX1 = Math.round(iw * 4 / 46);
          pasteY = Math.round(ih * 7 / 46);
          pasteX2 = Math.round(iw * 58 / 46);
        }
        bandW = Math.round(outW * 19 / 127); // 帯の幅
        // メモリ上に一時的なCanvasを作成して描画
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = outW;
        tempCanvas.height = outH;
        const tempCtx = tempCanvas.getContext('2d');
        // 背景（白）
        tempCtx.fillStyle = '#fff';
        tempCtx.fillRect(0, 0, outW, outH);
        // 右端にカラー帯（ピンク）
        // if (type !== 'real') {
        //   tempCtx.fillStyle = 'rgb(238,112,133)';
        //   tempCtx.fillRect(outW - bandW, 0, bandW, outH);
        // }
        // 左右に画像を配置
        tempCtx.drawImage(sourceImg, pasteX1, pasteY, iw, ih);
        tempCtx.drawImage(sourceImg, pasteX2, pasteY, iw, ih);

        // aiImageの場合ロゴのみを貼り付け
        if (type === 'ai') {
          const logoSize = Math.round(iw * 15 / 46);
          const logoY = Math.round(outH - (iw * 4 / 46) - (iw * 12.5 / 46));
          const logoX1 = Math.round(iw * 3.5 / 46);
          const logoX2 = Math.round(iw * 57.5 / 46);
          if (isLandscape) {
            // 横長画像ならロゴを回転させて貼り付け
            tempCtx.save();
            tempCtx.translate(logoX1 + logoSize / 2, logoY + logoSize / 2);
            tempCtx.rotate(-90 * Math.PI / 180); // 逆向きに90度回転
            tempCtx.drawImage(logo, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
            tempCtx.restore();
            tempCtx.save();
            tempCtx.translate(logoX2 + logoSize / 2, logoY + logoSize / 2);
            tempCtx.rotate(-90 * Math.PI / 180); // 逆向きに90度回転
            tempCtx.drawImage(logo, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
            tempCtx.restore();
          } else {
            tempCtx.drawImage(logo, logoX1, logoY, logoSize, logoSize);
            tempCtx.drawImage(logo, logoX2, logoY, logoSize, logoSize);
          }
        }

        // realImageの場合ロゴ、QRコードを貼り付け
        if (type === 'real') {
          const logoSize = Math.round(iw * 15 / 46);
          const logoY = Math.round(outH - (iw * 4 / 46) - (iw * 12.5 / 46));
          const logoX1 = Math.round(iw * 3.5 / 46 + bandW);
          const logoX2 = Math.round(iw * 57.5 / 46 + bandW);
          if (isLandscape) {
            // 横長画像ならロゴを回転させて貼り付け
            tempCtx.save();
            tempCtx.translate(logoX1 + logoSize / 2, logoY + logoSize / 2);
            tempCtx.rotate(90 * Math.PI / 180);
            tempCtx.drawImage(logo, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
            tempCtx.restore();
            tempCtx.save();
            tempCtx.translate(logoX2 + logoSize / 2, logoY + logoSize / 2);
            tempCtx.rotate(90 * Math.PI / 180);
            tempCtx.drawImage(logo, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
            tempCtx.restore();
          } else {
            tempCtx.drawImage(logo, logoX1, logoY, logoSize, logoSize);
            tempCtx.drawImage(logo, logoX2, logoY, logoSize, logoSize);
          }
          const qrSize = Math.round(iw * 10 / 46);
          const qrY = Math.round(outH - (iw * 4 / 46) - qrSize);
          const qrX1 = Math.round(iw * 57 / 46);
          const qrX2 = Math.round(iw * 111 / 46);
          tempCtx.drawImage(qrCode, qrX1, qrY, qrSize, qrSize);
          tempCtx.drawImage(qrCode, qrX2, qrY, qrSize, qrSize);
        }

        // aiImageの場合のみ、帯に「No:」+フォルダ名を描画
        if (type === 'ai' && textToWrite) {
          const noText = `No:${textToWrite}`;
          const fontSize = Math.round(iw * 7 / 46);
          tempCtx.font = `${fontSize}px "Comic Sans MS", "Chalkduster", "cursive"`;
          tempCtx.textAlign = 'left';

          // 描画位置を計算
          const textHeight = fontSize; // フォントサイズを高さとして近似

          // 貼り付け座標 (Pythonコードの im_new_w*109/127, im_new_w*22/127 を参考)
          const pasteX = Math.round(outW * 109 / 127);
          const pasteY = Math.round(outW * 22 / 127);

          tempCtx.save(); // 現在の状態を保存
          tempCtx.translate(pasteX + textHeight, pasteY); // 回転の中心を移動
          tempCtx.rotate(90 * Math.PI / 180); // 90度回転
          tempCtx.fillStyle = 'black';
          tempCtx.fillText(noText, 0, 0); // 新しい原点から描画
          tempCtx.restore(); // 保存した状態に戻す
        }



        return tempCanvas; // 加工済みのCanvas要素を返す
      };

      // realImageとaiImageをそれぞれ加工
      const chekiCanvasForReal = makeChekiFormat(realImage, 'real', parentFolderName);
      const chekiCanvasForAi = makeChekiFormat(aiImage, 'ai', parentFolderName);

      // StateにDataURLとして保存
      setGeneratedImages({
        real: chekiCanvasForReal.toDataURL('image/png'),
        ai: chekiCanvasForAi.toDataURL('image/png'),
      });

      // アップロード状態をリセット
      setUploadSuccess(false);
    }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrls, generatedImages]);

  // DataURLをBlobに変換するヘルパー関数
  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleUploadAll = async () => {
    if (Object.values(generatedImages).some(img => img === null) || !parentFolderId) return;

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const uploadPromises = Object.entries(generatedImages).map(([type, dataUrl]) => {
        const blob = dataURLtoBlob(dataUrl);
        const fileName = `AI_Cheki_${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}.png`;
        return uploadBlobToDrive(parentFolderId, blob, access_token, fileName);
      });

      const results = await Promise.all(uploadPromises);
      console.log('アップロード結果:', results);
      // 新しくアップロードしたファイルIDをExpandedFoldersに追加
      if (setExpandedFolders && results) {
        const newIds = results.map(r => r.id).filter(Boolean);
        setExpandedFolders(prev => {
          return {
            ...prev,
            [parentFolderId]: [...(Array.isArray(prev[parentFolderId]) ? prev[parentFolderId] : []), ...newIds]
          };
        });
      }
      // 新しくアップロードしたファイル情報をsubfolderContentsにも追加
      if (typeof setSubfolderContents === 'function' && results) {
        // resultsのidからDrive APIでファイル情報を取得し、subfolderContentsに追加
        const fileIds = results.map(r => r.id).filter(Boolean);
        const fileInfoList = await Promise.all(fileIds.map(id => fetchFileById(id)));
        setSubfolderContents(prev => ({
          ...prev,
          [parentFolderId]: [...(Array.isArray(prev[parentFolderId]) ? prev[parentFolderId] : []), ...fileInfoList]
        }));
      }
      onUploadComplete?.(); // 親に完了を通知してモーダルを閉じる
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
        {generatedImages.ai && (
          <div key="ai" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
              AI Image Ver.
            </h3>
            <img
              src={generatedImages.ai}
              alt="AI cheki"
              style={{
                border: '1px solid #ccc',
                borderRadius: '4px',
                maxWidth: '500px',
                height: 'auto'
              }}
            />
          </div>
        )}
        {generatedImages.real && (
          <div key="real" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Real Image Ver.
            </h3>
            <img
              src={generatedImages.real}
              alt="Real cheki"
              style={{
                border: '1px solid #ccc',
                borderRadius: '4px',
                maxWidth: '500px',
                height: 'auto'
              }}
            />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={handleUploadAll}
          disabled={isUploading || uploadSuccess || Object.values(generatedImages).some(img => img === null)}
          className="btn btn-generate"
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
        >
          {isUploading ? 'アップロード中...' : uploadSuccess ? 'アップロード完了' : 'すべてアップロード'}
        </button>
      </div>
    </div>
  );
}