import React, { useRef, useEffect, useState } from 'react';
import { FolderOpen, RefreshCw, LogOut, Shield } from 'lucide-react';
import '../css/PC.css';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const FOLDER_ID = process.env.REACT_APP_FOLDER_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';
const PAGE_SIZE = 100;

function PC() {
  const [files, setFiles] = useState([]);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [subfolderContents, setSubfolderContents] = useState({});
  const tokenClientRef = useRef(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);  // 追加: アップロード処理中フラグ
  const [driveFolderId, setDriveFolderId] = useState(FOLDER_ID); // 生成画像アップロード先フォルダID（初期値は環境変数のフォルダID）

  useEffect(() => {
    const initClient = async () => {
      await new Promise((resolve) => window.gapi.load('client', resolve));
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
    };
    initClient();
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        setToken(tokenResponse.access_token);
      },
    });
  }, []);

  useEffect(() => {
    if (token) {
      fetchFiles(token, FOLDER_ID, null, true);
    }
  }, [token]);

  const fetchFiles = async (accessToken, folderId, pageToken = null, reset = false) => {
    setLoading(true);
    try {
      window.gapi.client.setToken({ access_token: accessToken });
      const params = {
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, webContentLink, modifiedTime)',
        pageSize: PAGE_SIZE,
        orderBy: 'modifiedTime desc'
      };
      if (pageToken) params.pageToken = pageToken;
      const res = await window.gapi.client.drive.files.list(params);
      setFiles((prev) => (reset ? res.result.files : [...prev, ...res.result.files]));
      setNextPageToken(res.result.nextPageToken || null);
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (token && nextPageToken) {
      fetchFiles(token, FOLDER_ID, nextPageToken, false);
    }
  };

  const fetchSubfolderContents = async (folderId) => {
    if (subfolderContents[folderId]) return;
    try {
      const res = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webContentLink, parents)',
      });
      setSubfolderContents((prev) => ({
        ...prev,
        [folderId]: res.result.files,
      }));
    } catch (e) {
      console.error('サブフォルダ読み込み失敗:', e);
    }
  };

  const handleGenerateFromUrl = async (imageUrl, driveFolderId, accessToken) => {
    setGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          prompt: "", // 必要に応じて変更
          steps: 20,  // 必要に応じて変更
          driveFolderId,
          accessToken, // バックエンドで使用
        }),
      });
      const data = await response.json();
      if (data.success) {
        //ここは通っている
             // 新しいファイルオブジェクトを作成
     const newFile = {
       id: data.fileId,
       name: data.fileName,
       mimeType: data.mimeType,
       webContentLink: data.webContentLink,
       parents: data.parents || [driveFolderId],
     };

     // 親フォルダがトップレベルか判定
     if (driveFolderId === FOLDER_ID) {
       // トップレベル → files に追加
       setFiles((prevFiles) => [newFile, ...prevFiles]);
     } else {
       // サブフォルダ → subfolderContents に追加
       setSubfolderContents((prev) => {
         const updated = { ...prev };
         if (!updated[driveFolderId]) {
           updated[driveFolderId] = [];
         }
         updated[driveFolderId] = [newFile, ...updated[driveFolderId]];
         return updated;
       });
     }
     // さらに、数秒後にDrive全体と同期（整合性ラグ対策）
     setTimeout(() => {
       fetchFiles(token, FOLDER_ID, null, true);
     }, 3000);
        setGeneratedImageUrl(data.imageUrl);
        setDriveFolderId(driveFolderId); // 生成画像のアップロード先として保持
      } else {
        alert('画像生成に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadGeneratedImage = async () => {
    if (!generatedImageUrl || !driveFolderId || !token) {
      alert('画像URLまたはフォルダID、トークンが不足しています');
      return;
    }
    setUploading(true);
    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: generatedImageUrl,
          driveFolderId,
          accessToken: token,
        }),
      });
      const data = await response.json();
      console.log('アップロード結果:', data);
      if (data.success) {
        alert('アップロード成功！');
      } else {
        alert('アップロードに失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('通信エラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  const toggleFolder = async (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
    if (!expandedFolders[folderId]) {
      await fetchSubfolderContents(folderId);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setFiles([]);
    setNextPageToken(null);
    setExpandedFolders({});
    setSubfolderContents({});
    setGeneratedImageUrl(null);
    setDriveFolderId(FOLDER_ID);
  };

  const renderFiles = (filesList) => (
    <ul className="folder-list">
      {filesList.map((file) => (
        <li key={file.id}>
          {file.mimeType.includes('folder') ? (
            <div>
              <button
                className="folder-toggle"
                onClick={() => toggleFolder(file.id)}
              >
                {expandedFolders[file.id] ? '▼' : '▶︎'} {file.name}
              </button>
              {expandedFolders[file.id] && subfolderContents[file.id] && (
                <div className="folder-children">
                  {renderFiles(subfolderContents[file.id])}
                </div>
              )}
            </div>
          ) : (
            <div className="file-entry">
              <span>{file.name}</span>
              {file.webContentLink && (
                <>
                  <a
                    href={file.webContentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-download"
                  >
                    ダウンロード
                  </a>
                  <button
                    className="btn btn-generate"
                    onClick={() => {
                      const parentFolderId = file.parents && file.parents.length > 0 ? file.parents[0] : FOLDER_ID;
                      handleGenerateFromUrl(file.webContentLink, parentFolderId, token);
                    }}
                    disabled={generating}
                  >
                    {generating ? '生成中...' : 'この画像で生成'}
                  </button>
                </>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="app-container">
      <div className="container">
        <div className="content-wrapper">
          <div className="header-card">
            <div className="header-content">
              <div className="header-info">
                <div className="header-icon">
                  <FolderOpen className="icon-large" />
                </div>
                <div>
                  <h1 className="header-title">Google Drive ディレクトリ構造ビューア</h1>
                  <p className="header-subtitle">指定したフォルダ内のファイルを閲覧できます</p>
                </div>
              </div>
              {token && (
                <button onClick={handleLogout} className="btn btn-logout">
                  <LogOut className="icon-small" />
                  <span>ログアウト</span>
                </button>
              )}
            </div>
          </div>

          {!token ? (
            <div className="login-card">
              <div className="login-content">
                <div className="login-icon">
                  <Shield className="icon-extra-large" />
                </div>
                <h2 className="login-title">Googleアカウントでログイン</h2>
                <p className="login-subtitle">
                  Google Driveのファイルにアクセスするためにログインが必要です
                </p>
              </div>
              <button
                onClick={() => tokenClientRef.current?.requestAccessToken()}
                className="btn btn-primary"
              >
                Googleでログイン
              </button>
            </div>
          ) : (
            <>
              <div className="files-card">
                <div className="files-header">
                  <div className="files-header-content">
                    <h2 className="files-title">フォルダ内のファイル</h2>
                    <button
                      onClick={() => fetchFiles(token, FOLDER_ID, null, true)}
                      disabled={loading}
                      className="btn btn-refresh"
                    >
                      <RefreshCw className={`icon-small ${loading ? 'loading' : ''}`} />
                      <span>再読み込み</span>
                    </button>
                  </div>
                </div>

                <div className="files-content">
                  {loading ? (
                    <div className="loading-container">
                      <div className="spinner"></div>
                      <p className="loading-text">読み込み中...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="empty-state">
                      <FolderOpen className="empty-icon" />
                      <p>このフォルダにファイルはありません</p>
                    </div>
                  ) : (
                    renderFiles(files)
                  )}
                </div>

                {nextPageToken && (
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                  >
                    もっと読み込む
                  </button>
                )}

                {files.length > 0 && (
                  <div className="files-footer">
                    <p className="files-count">{files.length} 件のアイテムを表示中</p>
                  </div>
                )}
              </div>

              {/* 生成画像表示＆アップロードボタン */}
              {generatedImageUrl && (
                <div className="generated-image-section" style={{ marginTop: '2rem' }}>
                  <h3>生成画像</h3>
                  <img
                    src={generatedImageUrl}
                    alt="生成画像"
                    style={{ maxWidth: '300px', maxHeight: '300px', marginBottom: '1rem' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadGeneratedImage}
                    disabled={uploading}
                  >
                    {uploading ? 'アップロード中...' : 'アップロード'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PC;
