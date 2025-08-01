export async function fetchDriveFiles(gapiClient, folderId, pageSize = 100, pageToken = null) {
  const params = {
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'nextPageToken, files(id, name, mimeType, webContentLink, modifiedTime, parents)',
    pageSize,
    orderBy: 'modifiedTime desc',
  };
  if (pageToken) params.pageToken = pageToken;

  const res = await gapiClient.drive.files.list(params);
  return res.result;
}

export async function deleteDriveFile(gapiClient, fileId) {
  return await gapiClient.drive.files.delete({ fileId });
}
