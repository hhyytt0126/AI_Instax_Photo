require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const { generateImage } = require('./generator.js');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const baseFolder = path.join(__dirname, 'uploads');

// buffer を ReadableStream に変換
function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

// Google Drive へ multipart アップロード
async function uploadFileToDrive(accessToken, folderId, fileName, buffer, mimeType) {
  console.log('uploadFileToDrive called with token:', accessToken?.substring(0,10), '...');
  if (!accessToken) {
    throw new Error('Google Drive のアクセストークンが指定されていません');
  }
  const form = new FormData();
  // メタデータは文字列で OK
  form.append('metadata', JSON.stringify({ name: fileName, parents: [folderId] }), {
    contentType: 'application/json',
  });
  // ファイル本体は ReadableStream で渡す
  form.append('file', bufferToStream(buffer), {
    filename: fileName,
    contentType: mimeType,
  });

  const res = await axios.post(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    form,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
    }
  );
  return res.data;
}

// フォルダ作成
app.post('/api/folders', (req, res) => {
  const { folderName } = req.body;
  const folderPath = path.join(baseFolder, folderName);
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  res.json({ success: true });
});

// 最新フォルダ番号取得
app.get('/api/folders/latest', (req, res) => {
  if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);
  const folders = fs.readdirSync(baseFolder).filter(f => /^\d+$/.test(f));
  const max = folders.length > 0 ? Math.max(...folders.map(Number)) : 0;
  res.json({ latestFolderNumber: max });
});

// 画像生成＋Drive アップロード
app.post('/api/generate', async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const { imageUrl, payload, driveFolderId, accessToken } = req.body;
    console.log('imageUrl:', imageUrl, 'payload:', payload, 'driveFolderId:', driveFolderId, 'accessToken:', accessToken?.substring(0,10), '...');
    // AI 画像生成
    const imageBuffer = await generateImage(imageUrl, payload);

    // アップロード用ファイル名
    const timestamp = Date.now();
    const fileName = `${timestamp}-AIphoto.jpg`;

    //Google Drive にアップロード
    const uploaded = await uploadFileToDrive(
      accessToken,
      driveFolderId,
      fileName,
      imageBuffer,
      'image/jpg'
    );

    res.json({
      success: true,
      fileId: uploaded.id,
      fileName: uploaded.name,
      mimeType: uploaded.mimeType,
      webViewLink: uploaded.webViewLink,
      webContentLink: uploaded.webContentLink,
      parents: uploaded.parents,
    });
  } catch (err) {
    console.error('Error in /api/generate:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 静的ファイル配信
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));
app.use('/folders', express.static(baseFolder));

app.listen(5000, () => {
  console.log('Backend running on http://localhost:5000');
});
