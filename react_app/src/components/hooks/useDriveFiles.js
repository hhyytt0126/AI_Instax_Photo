import { useState } from 'react';

export function convertToViewLink(downloadUrl) {
  const match = downloadUrl.match(/id=([^&]+)/);
  if (!match) return null;

  const fileId = match[1];
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
export function useDriveFiles(gapiClient, PAGE_SIZE = 100) {
  const [files, setFiles] = useState([]); // トップレベルのファイル一覧
  const [subfolderContents, setSubfolderContents] = useState({}); // フォルダIDをキーにファイル配列を格納
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);

  // フォルダ内ファイル一覧取得（トップレベル用）
  const fetchFiles = async (folderId, reset = false, pageToken = null) => {
    if (!gapiClient || !gapiClient.drive) {
      console.error('gapiClient が未初期化です');
      return;
    }

    setLoading(true);
    try {
      const params = {
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, webContentLink, modifiedTime, parents)',
        pageSize: PAGE_SIZE,
        orderBy: 'modifiedTime desc',
      };
      if (pageToken) params.pageToken = pageToken;

      const res = await gapiClient.drive.files.list(params);
      const newFiles = res.result.files || [];
      setFiles((prev) => (reset ? newFiles : [...prev, ...newFiles]));
      setNextPageToken(res.result.nextPageToken || null);
    } catch (error) {
      console.error('ファイル取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // サブフォルダ内ファイル一覧取得
  const fetchSubfolderContents = async (folderId) => {
    if (!gapiClient || !gapiClient.drive) {
      console.error('gapiClient が未初期化です');
      return;
    }

    if (subfolderContents[folderId]) return; // 既に取得済みなら再取得しない

    setLoading(true);
    try {
      const res = await gapiClient.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webContentLink, parents)',
        pageSize: PAGE_SIZE,
      });
      setSubfolderContents((prev) => ({
        ...prev,
        [folderId]: res.result.files || [],
      }));
    } catch (error) {
      console.error('サブフォルダ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };
  // ファイル削除
  const deleteFile = async (fileId, parentFolderId = null) => {
    if (!gapiClient || !gapiClient.drive) {
      console.error('gapiClient が未初期化です');
      return;
    }

    setLoading(true);
    try {
      await gapiClient.drive.files.delete({ fileId });

      // トップレベルファイルリストから削除
      setFiles((prev) => prev.filter((file) => file.id !== fileId));

      // サブフォルダ内ファイルリストから削除
      if (parentFolderId && subfolderContents[parentFolderId]) {
        setSubfolderContents((prev) => {
          const updated = { ...prev };
          updated[parentFolderId] = updated[parentFolderId].filter((file) => file.id !== fileId);
          return updated;
        });
      }
    } catch (error) {
      console.error('ファイル削除エラー:', error);
      throw error; // 呼び出し元でキャッチしたい場合はthrowしてもOK
    } finally {
      setLoading(false);
    }
  };
  async function fetchFileById(fileId) {
  // fields は必要な情報だけ抜き出せます。たとえば id, name, mimeType, webViewLink, parents など。
  const res = await window.gapi.client.drive.files.get({
    fileId,
    fields: 'id, name, mimeType, webContentLink, webViewLink, thumbnailLink, parents'
  });
  return res.result;
  }
  return {
    files,
    subfolderContents,
    loading,
    nextPageToken,
    fetchFiles,
    fetchSubfolderContents,
    deleteFile,
    setFiles,
    setSubfolderContents,
    fetchFileById,
  };
}
