/**
 * ファイル選択ダイアログをトリガーし、選択された画像をプレビューのために読み込む。
 * @param {function(string): void} onPhotoSelected - 画像が選択されたときに、
 * その画像のデータURLを引数として呼び出されるコールバック関数。
 */
const uploadPhoto = (onPhotoSelected) => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    // --- ここからが画像プレビューのためのコード ---
    // FileReaderのインスタンスを作成
    const reader = new FileReader();

    // ファイルの読み込みが完了したときの処理を定義
    reader.onload = (event) => {
      // 読み込んだ結果 (データURL) をコールバック関数に渡す
      if (onPhotoSelected) {
        onPhotoSelected(event.target.result);
      }
    };

    // ファイルをデータURLとして読み込む
    // データURLは、画像を直接埋め込める形式の文字列
    reader.readAsDataURL(file);
    // --- ここまでが画像プレビューのためのコード ---

    // 本来のアップロード処理もここで行うことができる
    // const formData = new FormData();
    // formData.append('photo', file);
    // fetch(...);
  };

  //.env APIの管理


  fileInput.click();
};

export default uploadPhoto;