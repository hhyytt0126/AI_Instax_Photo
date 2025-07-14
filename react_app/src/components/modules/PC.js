import React, { useRef, useEffect, useState } from 'react';
import { FolderOpen, FileText, RefreshCw, LogOut, Shield } from 'lucide-react';
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
        fields: 'nextPageToken, files(id, name, mimeType, webContentLink)',
        pageSize: PAGE_SIZE,
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
        fields: 'files(id, name, mimeType, webContentLink)',
      });
      setSubfolderContents((prev) => ({
        ...prev,
        [folderId]: res.result.files,
      }));
    } catch (e) {
      console.error('サブフォルダ読み込み失敗:', e);
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
  };

  const getFileIcon = (mimeType) =>
    mimeType.includes('folder') ? (
      <FolderOpen className="file-icon file-icon-folder" />
    ) : (
      <FileText className="file-icon file-icon-file" />
    );

  const getFileTypeLabel = (mimeType) => {
    if (mimeType.includes('folder')) return 'フォルダ';
    if (mimeType.includes('document')) return 'ドキュメント';
    if (mimeType.includes('spreadsheet')) return 'スプレッドシート';
    if (mimeType.includes('presentation')) return 'プレゼンテーション';
    if (mimeType.includes('image')) return '画像';
    if (mimeType.includes('video')) return '動画';
    if (mimeType.includes('audio')) return '音声';
    return 'ファイル';
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
                <a
                  href={file.webContentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-download"
                >
                  ダウンロード
                </a>
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
          )}
        </div>
      </div>
    </div>
  );
}

export default PC;
