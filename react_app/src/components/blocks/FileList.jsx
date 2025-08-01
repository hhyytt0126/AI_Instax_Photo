import React, {useState} from 'react';
import '../css/FileList.css'; // Assuming you have a CSS file for styling
import GenerateModal from './GenerateModal';

export default function FileList({
  files,
  subfolderContents,
  expandedFolders,
  toggleFolder,
  handleGenerateFromUrl,
  handleDeleteFile,
  handlePreviewImage,
  handleUploadGeneratedImage,
  generating,
  rootFolderId // FOLDER_ID を親コンポーネントから渡す
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const renderFiles = (fileList) => (
    <ul className="folder-list">
      {fileList.map((file) => {

        const parentFolderId = file.parents && file.parents.length > 0 ? file.parents[0] : rootFolderId;

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
            {expandedFolders[file.id] && subfolderContents[file.id] && (
                <div
                id={`folder-children-${file.id}`}
                className="folder-children"
                style={{ paddingLeft: '1.2rem', marginTop: '0.4rem' }}
                >
                {renderFiles(subfolderContents[file.id])}
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
                      onClick={() => handlePreviewImage(file.id)
                      }
                    >
                      プレビュー
                    </button>
                    <button
                      className="btn btn-download"
                      onClick={() => window.open(file.webContentLink, "_blank", "noopener,noreferrer")}
                    >
                      ダウンロード
                    </button>
                    <button
                      className="btn btn-generate"
                      onClick={
                        () => {setSelectedFile(file)
                              setShowModal(true)
                        }
                      }
                      disabled={generating}
                    >
                      {generating ? '生成中...' : 'この画像で生成'}
                    </button>
                    {selectedFile?.id === file.id && showModal &&(
                      <GenerateModal
                        imageUrl={file.webContentLink}
                        onClose={() => setShowModal(false)}
                        onGenerate={(settings) => handleGenerateFromUrl(file.webContentLink, parentFolderId, settings)}
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

  return renderFiles(files);
}
