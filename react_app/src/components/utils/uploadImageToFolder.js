// src/components/utils/uploadImageToFolder.js

export default async function uploadImageToFolder(folderName, dataUrl) {
  const response = await fetch(`/api/folders/${folderName}/upload`, {
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