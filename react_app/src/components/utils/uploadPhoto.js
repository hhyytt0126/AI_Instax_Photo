/**
 * ファイル選択ダイアログをトリガーし、選択された画像をプレビューのために読み込む。
 * 画像はメモリ消費を抑えるためにリサイズされる。
 * @param {function(string): void} callback - 画像が選択・リサイズされたときに、
 * その画像のデータURLを引数として呼び出されるコールバック関数。
 */
const uploadPhoto = (callback) => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // --- 画像リサイズ処理 ---
        const MAX_WIDTH = 1920; // リサイズ後の最大幅
        const MAX_HEIGHT = 1920; // リサイズ後の最大高さ

        let width = img.width;
        let height = img.height;

        // アスペクト比を維持しながらリサイズ
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // リサイズされた画像をJPEGのDataURLとしてコールバックに渡す
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // 第2引数は品質(0-1)
        callback(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  fileInput.click();
};

export default uploadPhoto;