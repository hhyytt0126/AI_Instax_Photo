import QRCode from "qrcode";

export default async function generateQRCode(folderId) {
  try {
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
    return await QRCode.toDataURL(folderUrl);
  } catch (error) {
    console.error("QRコード生成時のエラー:", error);
    throw error;
  }
}