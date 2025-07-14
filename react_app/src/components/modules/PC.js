import React, { useRef, useEffect, useState } from 'react';
import { FolderOpen, FileText, RefreshCw, LogOut, Shield } from 'lucide-react';
import '../css/PC.css';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const FOLDER_ID = process.env.REACT_APP_FOLDER_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

function PC() {
  const [files, setFiles] = useState([]);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const tokenClientRef = useRef(null);

  useEffect(() => {
    // gapiの初期化
    const initClient = async () => {
      await new Promise((resolve) => window.gapi.load('client', resolve));
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
    };

    initClient();

    // tokenClientの初期化
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
      listFiles(token);
    }
  }, [token]);

  const listFiles = async (accessToken) => {
    setLoading(true);
    try {
      window.gapi.client.setToken({ access_token: accessToken });
      const res = await window.gapi.client.drive.files.list({
        q: `'${FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
      });
      setFiles(res.result.files);
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setFiles([]);
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('folder')) {
      return <FolderOpen className="file-icon file-icon-folder" />;
    }
    return <FileText className="file-icon file-icon-file" />;
  };

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

  return (
    <div className="app-container">
      <div className="container">
        <div className="content-wrapper">
          {/* ヘッダー */}
          <div className="header-card">
            <div className="header-content">
              <div className="header-info">
                <div className="header-icon">
                  <FolderOpen className="icon-large" />
                </div>
                <div>
                  <h1 className="header-title">
                    Google Drive ディレクトリ構造ビューア
                  </h1>
                  <p className="header-subtitle">
                    指定したフォルダ内のファイルを閲覧できます
                  </p>
                </div>
              </div>
              {token && (
                <button
                  onClick={handleLogout}
                  className="btn btn-logout"
                >
                  <LogOut className="icon-small" />
                  <span>ログアウト</span>
                </button>
              )}
            </div>
          </div>

          {/* メインコンテンツ */}
          {!token ? (
            <div className="login-card">
              <div className="login-content">
                <div className="login-icon">
                  <Shield className="icon-extra-large" />
                </div>
                <h2 className="login-title">
                  Googleアカウントでログイン
                </h2>
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
              {/* ファイル一覧ヘッダー */}
              <div className="files-header">
                <div className="files-header-content">
                  <h2 className="files-title">
                    フォルダ内のファイル
                  </h2>
                  <button
                    onClick={() => listFiles(token)}
                    disabled={loading}
                    className="btn btn-refresh"
                  >
                    <RefreshCw className={`icon-small ${loading ? 'loading' : ''}`} />
                    <span>再読み込み</span>
                  </button>
                </div>
              </div>

              {/* ファイル一覧 */}
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
                  <div className="files-grid">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="file-item"
                      >
                        {getFileIcon(file.mimeType)}
                        <div className="file-info">
                          <p className="file-name">{file.name}</p>
                          <p className="file-type">
                            {getFileTypeLabel(file.mimeType)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* フッター */}
              {files.length > 0 && (
                <div className="files-footer">
                  <p className="files-count">
                    {files.length} 個のアイテムが見つかりました
                  </p>
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