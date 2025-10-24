// src/components/utils/uploadImageToFolder.js

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

function buildApiUrl(endpoint) {
  const isProd = process.env.NODE_ENV === 'production';
  const isDefaultApi = BASE_URL === '/api';
  const needsJs = isProd && isDefaultApi && !endpoint.endsWith('.js');
  return `${BASE_URL}${endpoint}${needsJs ? '.js' : ''}`;
}

export default async function uploadImageToFolder(folderName, dataUrl) {
  const response = await fetch(buildApiUrl(`/folders/${folderName}/upload`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: dataUrl }),
  });

  if (!response.ok) {
    throw new Error("画像のアップロードに失敗しました。");
  }
}