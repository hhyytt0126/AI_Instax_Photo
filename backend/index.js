const { exec } = require("child_process");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { google } = require("googleapis");
const { Readable } = require("stream");
const { generateImage } = require("./generator.js");
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const baseFolder = path.join(__dirname, "uploads");

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null); // 終了
  return readable;
}
// アップロード処理（Google Drive）
async function uploadFileToDrive(accessToken, folderId, fileName, buffer, mimeType) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: bufferToStream(buffer), // Convert buffer to stream
    },
    fields: "id, name, mimeType, webViewLink, webContentLink, parents", // ← これ必須
    // ,
  });

  return res.data;
}

// フォルダ作成
app.post("/api/folders", (req, res) => {
  const { folderName } = req.body;
  const folderPath = path.join(baseFolder, folderName);
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  res.json({ success: true });
});

// 最新フォルダ番号取得
app.get("/api/folders/latest", (req, res) => {
  if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);
  const folders = fs.readdirSync(baseFolder).filter((f) => /^\d+$/.test(f));
  const max = folders.length > 0 ? Math.max(...folders.map(Number)) : 0;
  res.json({ latestFolderNumber: max });
});

// 画像アップロード
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, steps, driveFolderId, accessToken, imageUrl } = req.body;

    console.log("Received prompt:", prompt, "Steps:", steps, "Image URL:", imageUrl);

    // 元画像の取得（必要に応じて利用）
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const mimeType = response.headers["content-type"] || "image/png";

    // 画像生成（AIモデルから取得）
    const imageBuffer = await generateImage(imageUrl); // ← あなたのカスタム関数

    // アップロード用ファイル名
    const timestamp = Date.now();
    const extension = mimeType.split("/")[1] || "png";
    const fileName = `generated-${timestamp}.${extension}`;

    // Google Drive へアップロード
    const uploaded = await uploadFileToDrive(
      accessToken,
      driveFolderId,
      fileName,
      imageBuffer,
      mimeType
    );

    console.log("Uploaded file:", uploaded);

    // **重要: fields を指定してアップロード情報を取得**
    // uploaded は Google Drive API のレスポンスで、以下を含む:
    // { id, name, mimeType, webViewLink, webContentLink, parents }

    // レスポンスをフロントに返す
    res.json({
      success: true,
      fileId: uploaded.id,
      fileName: uploaded.name,
      mimeType: uploaded.mimeType,
      webViewLink: uploaded.webViewLink,
      webContentLink: uploaded.webContentLink,
      parents: uploaded.parents || [driveFolderId],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "画像生成またはDriveアップロードに失敗しました" });
  }
});

// 静的ファイル提供
app.use("/outputs", express.static(path.join(__dirname, "outputs")));
app.use("/folders", express.static(baseFolder));

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
