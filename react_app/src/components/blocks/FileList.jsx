import React, { useState } from 'react';
import '../css/FileList.css';
import GenerateModal from './GenerateModal';
import StitchImages from './StitchImages';
import { fetchDriveImageBlobUrl, access_token } from '../hooks/useDriveFiles';

export default function FileList({
  files,
  subfolderContents,
  expandedFolders,
  toggleFolder,
  handleGenerateFromUrl,
  handleDeleteFile,
  handlePreviewImage,
  generating,
  rootFolderId,
  onRefreshFolder // 親からファイルリスト再取得関数を受け取る
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [modalFile, setModalFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  // チェキフォーマット生成用モーダル表示制御
  const [showStitchModal, setShowStitchModal] = useState(false);
  const [stitchImages, setStitchImages] = useState([]);
  const [uploadFolderId, setUploadFolderId] = useState(null);
  const [isStitching, setIsStitching] = useState(false);

  const IMGLENGTH = 3; // 連結する画像の枚数

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : prev.length < IMGLENGTH
          ? [...prev, fileId]
          : prev
    );
  };

  const handleStitchImages = async () => {
    if (selectedFiles.length !== IMGLENGTH) return;

    setIsStitching(true);

    // 選択された最初のファイルが含まれるフォルダIDを特定する
    let parentFolderId = null;
    for (const folderId in subfolderContents) {
      if (subfolderContents[folderId].some(file => file.id === selectedFiles[0])) {
        parentFolderId = folderId;
        break;
      }
    }
    if (!parentFolderId) {
        alert('アップロード先のフォルダを特定できませんでした。');
        setIsStitching(false);
        return;
    }

    try {
      const blobUrls = await Promise.all(
        selectedFiles.map(fileId => fetchDriveImageBlobUrl(fileId, access_token))
      );
      setStitchImages(blobUrls);
      setUploadFolderId(parentFolderId);
      setShowStitchModal(true);
    } catch (error) {
      console.error('画像の取得または連結に失敗しました:', error);
      alert('画像の取得または連結に失敗しました。');
    } finally {
      setIsStitching(false);
    }
  };

  const handleUploadComplete = async () => {
    setShowStitchModal(false);
    setSelectedFiles([]); // 選択状態をリセット
    if (onRefreshFolder && uploadFolderId) {
      await onRefreshFolder(uploadFolderId); // ファイルリストを再取得
    }
    alert('アップロードに成功し、リストを更新しました！');
  };



  const renderFiles = (fileList) => (
    <ul className="folder-list">
      {fileList.map(file => {
        const parentFolderId =
          file.parents && file.parents.length > 0
            ? file.parents[0]
            : rootFolderId;

        // サブフォルダの子ファイル一覧
        const children = subfolderContents[file.id] || [];
        const selectedInFolder = children.filter(child =>
          selectedFiles.includes(child.id)
        );

        return (
          <li key={file.id}>
            {file.mimeType.includes('folder') ? (
              <div>
                <button
                  className="folder-toggle"
                  onClick={() => toggleFolder(file.id)}
                  aria-expanded={expandedFolders[file.id] ? 'true' : 'false'}
                  aria-controls={`folder-children-${file.id}`}
                >
                  {expandedFolders[file.id] ? '▼' : '▶︎'} {file.name}
                </button>

                {expandedFolders[file.id] && (
                  <div
                    id={`folder-children-${file.id}`}
                    className="folder-children"
                    style={{ paddingLeft: '1.2rem', marginTop: '0.4rem' }}
                  >
                    {children.map(child => (
                      <div key={child.id} className="file-entry">
                        <span>{child.name}</span>

                        {child.webContentLink && (
                          
                          <>
                            <button
                              className="btn btn-preview"
                              onClick={() => handlePreviewImage(child.id)}
                            >
                              プレビュー
                            </button>
                            <button
                              className="btn btn-download"
                              onClick={() => window.open(child.webContentLink, '_blank', 'noopener,noreferrer')}
                            >
                              ダウンロード
                            </button>
                            <button
                              className="btn btn-generate"
                              onClick={() => {
                                setModalFile(child);
                                setShowModal(true);
                              }}
                              disabled={generating}
                            >
                              {generating ? '生成中...' : 'この画像で生成'}
                            </button>
                            {modalFile?.id === child.id && showModal && (
                              <GenerateModal
                                imageUrl={child.webContentLink}
                                onClose={() => setShowModal(false)}
                                onGenerate={settings => handleGenerateFromUrl(child.webContentLink, child.parents[0], settings)}
                                generating={generating}
                              />
                            )}
                            <button
                              className="btn btn-delete"
                              onClick={() => handleDeleteFile(child.id, child.parents[0])}
                            >
                              削除
                            </button>
                          </>
                        )}

                        <button
                          className="btn btn-select-file"
                          onClick={() => toggleFileSelection(child.id)}
                          disabled={!selectedFiles.includes(child.id) && selectedFiles.length >= IMGLENGTH}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          {selectedFiles.includes(child.id) ? '選択解除' : 'このファイルを選択'}
                        </button>
                      </div>
                    ))}

                    {selectedInFolder.length === IMGLENGTH && (
                      <button
                        className="btn btn-generate"
                        onClick={handleStitchImages}
                        style={{ marginTop: '0.5rem' }}
                        disabled={isStitching}
                      >
                        {isStitching ? '準備中...' : 'AIチェキを作成'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="file-entry">
                <span>{file.name}</span>

                {file.webContentLink && (
                  <>
                    <button
                      className="btn btn-preview"
                      onClick={() => handlePreviewImage(file.id)}
                    >
                      プレビュー
                    </button>
                    <button
                      className="btn btn-download"
                      onClick={() => window.open(file.webContentLink, '_blank', 'noopener,noreferrer')}
                    >
                      ダウンロード
                    </button>
                    <button
                      className="btn btn-generate"
                      onClick={() => {
                        setModalFile(file);
                        setShowModal(true);
                      }}
                      disabled={generating}
                    >
                      {generating ? '生成中...' : 'この画像で生成'}
                    </button>
                    {modalFile?.id === file.id && showModal && (
                      <GenerateModal
                        imageUrl={file.webContentLink}
                        onClose={() => setShowModal(false)}
                        onGenerate={settings => handleGenerateFromUrl(file.webContentLink, parentFolderId, settings)}
                        generating={generating}
                      />
                    )}
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDeleteFile(file.id, parentFolderId)}
                    >
                      削除
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {renderFiles(files)}
      {showStitchModal && (
        <div className="modal-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, position: 'relative' }}>
            <button style={{ position: 'absolute', top: 8, right: 8, cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '1.5rem' }} onClick={() => setShowStitchModal(false)}>
              &times;
            </button>
            <StitchImages
              imageUrls={stitchImages}
              parentFolderId={uploadFolderId}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>
      )}
    </>
  );
}