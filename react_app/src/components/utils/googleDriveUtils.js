// googleDriveUtils.js

const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// GAPI初期化関数
export async function initializeGapi() {
  return new Promise((resolve, reject) => {
    if (window.gapi === undefined) {
      reject(new Error("GAPI not loaded"));
      return;
    }

    window.gapi.load("client", async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Google Driveにフォルダを作成する
export async function createDriveSubFolder(parentFolderId, folderName) {
  if (!window.gapi?.client?.drive) throw new Error("Google Drive API is not initialized");

  const response = await window.gapi.client.drive.files.create({
    resource: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return response.result.id;
}

// データURLの画像をGoogle Driveにアップロード
export async function uploadImageToDrive(folderId, dataUrl, accessToken) {
  if (!window.gapi?.client?.drive) throw new Error("Google Drive API is not initialized");

  const byteString = atob(dataUrl.split(",")[1]);
  const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });

  const metadata = {
    name: `photo_${Date.now()}.png`,
    mimeType: mimeString,
    parents: [folderId],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
    body: form,
  });

  const result = await response.json();
  return result.id;
}
