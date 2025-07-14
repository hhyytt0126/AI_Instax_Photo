const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const fs = require("fs");
const path = require("path");

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const baseFolder = path.join(__dirname, "uploads");

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
  const folders = fs.readdirSync(baseFolder).filter(f => /^\d+$/.test(f));
  const max = folders.length > 0 ? Math.max(...folders.map(Number)) : 0;
  res.json({ latestFolderNumber: max });
});

// 画像アップロード
app.post("/api/folders/:folder/upload", (req, res) => {
  const { folder } = req.params;
  const { image } = req.body;
  const folderPath = path.join(baseFolder, folder);
  const filePath = path.join(folderPath, "image.png");

  const base64Data = image.replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync(filePath, base64Data, "base64");

  res.json({ success: true });
});

// 公開フォルダの配信
app.use("/folders", express.static(baseFolder));

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});

