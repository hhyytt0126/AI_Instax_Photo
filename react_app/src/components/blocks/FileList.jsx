import React, { useState } from 'react';
import '../css/FileList.css';
import GenerateModal from './GenerateModal';

export default function FileList({
  files,
  subfolderContents,
  expandedFolders,
  toggleFolder,
  handleGenerateFromUrl,
  handleDeleteFile,
  handlePreviewImage,
  generating,
  rootFolderId
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [modalFile, setModalFile] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const IMGLENGTH = 3;

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : prev.length < IMGLENGTH
          ? [...prev, fileId]
          : prev
    );
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
                                onGenerate={settings => handleGenerateFromUrl(child.webContentLink, child.parents, settings)}
                                generating={generating}
                              />
                            )}
                            <button
                              className="btn btn-delete"
                              onClick={() => handleDeleteFile(child.id, child.parents)}
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
                        onClick={() => console.log('選択されたファイルID：', selectedInFolder.map(f => f.id))}
                        style={{ marginTop: '0.5rem' }}
                      >
                        AIチェキを作成
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

  return <>{renderFiles(files)}</>;
}
