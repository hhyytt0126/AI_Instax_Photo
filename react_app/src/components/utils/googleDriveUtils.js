// src/components/utils/googleDriveUtils.js
/* global gapi */
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export async function initGoogleAPI(clientId, apiKey) {
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          apiKey,
          clientId,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
          scope: SCOPES,
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function createDriveSubFolder(parentFolderId, folderName) {
  const res = await gapi.client.drive.files.create({
    resource: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });
  return res.result.id;
}

export async function uploadImageToDrive(folderId, base64DataUrl) {
  const byteString = atob(base64DataUrl.split(',')[1]);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: 'image/png' });

  const metadata = {
    name: `photo_${Date.now()}.png`,
    mimeType: 'image/png',
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const accessToken = gapi.auth.getToken().access_token;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
    body: form,
  });

  const result = await response.json();
  return result.id;
}