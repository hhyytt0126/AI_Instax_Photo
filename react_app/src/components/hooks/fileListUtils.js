/**
 * このファイルは、Google DriveのファイルIDから画像を取得し、
 * 印刷処理を実行するためのユーティリティ関数を含みます。
 * * 注意: fetchDriveImageBlobUrl および access_token は
 * './useDriveFiles' モジュールからインポートされていることを前提とします。
 */

// 外部依存関係: 実際の環境に合わせて実装が必要です。
import { fetchDriveImageBlobUrl, access_token } from './useDriveFiles';

/**
 * Google DriveのファイルID（複数可）から画像を印刷する（Blob URL経由）
 * 各画像は1ページに収まり、画像の間に改ページが挿入されます。
 * @param {string|string[]} fileIds - Google Driveの画像ファイルIDまたは配列
 */
export async function handlePrintImage(fileIds) {
    // ファイルIDを配列として正規化
    const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
    console.log('印刷対象のファイルID:', ids);

    // 画像読み込み完了を待つために、Blob URLの総数を取得
    const totalImages = ids.length;

    // ポップアップブロックを回避するため、先にウィンドウを開く
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        // ユーザーにポップアップブロックの解除を促す
        alert('ポップアップがブロックされました。このサイトのポップアップを許可してください。');
        console.error('印刷ウィンドウを開けませんでした。ポップアップがブロックされている可能性があります。');
        return; // 処理を中断
    }

    // 先にローディングメッセージなどを表示しておく
    printWindow.document.write('<html><head><title>画像印刷</title></head><body><p>画像を読み込み中です。しばらくお待ちください...</p></body></html>');

    try {
        // すべてのBlobUrlを非同期で取得
        const blobUrls = await Promise.all(
            ids.map(fileId => fetchDriveImageBlobUrl(fileId, access_token))
        );

        // ドキュメントをクリアしてから新しい内容を書き込む
        printWindow.document.open();

        // 印刷ウィンドウにコンテンツを書き込む
        printWindow.document.write(`
            <html>
                <head>
                    <title>画像印刷</title>
            <style>
                @media print {
                    /* --- 修正点 1: html, body から vw/vh の強制的な指定を削除 --- */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        /* width/heightの強制的な指定を削除し、ブラウザの印刷設定に委ねる */
                    }
                    
                    /* --- 修正点 2: 各ページコンテナのスタイル設定 --- */
                    .print-page {
                        /* 1ページ分を占有し、次の要素の前に改ページを強制 */
                        page-break-after: always;
                        break-after: page;
                        /* 親要素の幅/高さを基準に100%に設定 */
                        width: 100%; 
                        height: 100%;
                        display: block;
                        box-sizing: border-box;
                    }
                    
                    .print-page:last-child {
                        /* 最後のページの後には改ページしない */
                        page-break-after: auto;
                        break-after: auto;
                    }
                    
                    /* --- 修正点 3: 画像をコンテナに収める (vw/vhを100%に修正) --- */
                    img {
                        /* 親要素 (.print-page) の幅と高さにフィット */
                        width: 100% !important; 
                        height: 100% !important; 
                        /* アスペクト比を維持しつつ全体に収まるように表示 */
                        object-fit: contain !important; 
                        display: block;
                        margin: 0 auto;
                    }
                }
            </style>
                </head>
                <body>
                    <!-- 各画像を個別のページコンテナ (.print-page) でラップする -->
                    ${blobUrls.map((url, i) => `
                        <div class="print-page">
                            <img src="${url}" id="printimg${i}" />
                        </div>
                    `).join('')}

                    <script>
                        let loaded = 0;
                        const total = ${totalImages};
                        
                        // 画像の読み込み完了を待ってから印刷を開始
                        for(let i = 0; i < total; i++) {
                            // 修正: printWindow は定義されていないため、document.getElementById を直接使用
                            const img = document.getElementById('printimg' + i);
                            
                            // 画像がすでにキャッシュされている場合の処理
                            if (img.complete) {
                                loaded++;
                            } else {
                                img.onload = function() {
                                    loaded++;
                                    console.log('読み込み済み画像:', loaded + '/' + total);
                                    if(loaded === total) {
                                        // 全ての画像の読み込みが完了したら印刷
                                        window.print();
                                        // 印刷ダイアログを閉じたらウィンドウも閉じる場合は以下のコメントを解除
                                        // window.close(); 
                                    }
                                }
                            }
                            // 読み込みエラー時の処理 (オプション)
                            img.onerror = function() {
                                console.error('画像の読み込みに失敗しました:', img.src);
                                loaded++; // エラーでもカウンターを進める
                                if(loaded === total) {
                                    window.print();
                                }
                            }
                        }

                        // 画像がすべてキャッシュ済みで onload が発火しなかった場合の最終チェック
                        if (loaded === total) {
                            window.print();
                            // window.close();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    } catch (err) {
        // alert は使用できないため、代わりにコンソールにエラーを出力
        console.error('画像の印刷に失敗しました:', err.message, err);

        // ユーザー向けに、メッセージボックスの代わりとなるUIを検討する（ここでは簡略化）
        // 実際のアプリケーションでは、カスタムモーダルUIを使用してください
        // Note: alert() is used here only as a temporary placeholder for custom UI
        const errorMessage = '画像の印刷に失敗しました: ' + err.message;
        alert(errorMessage);
    }
}
