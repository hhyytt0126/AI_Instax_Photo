const { Readable } = require('stream');

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null); // End of stream
  return readable;
}

async function uploadFileToDrive(accessToken, folderId, fileName, fileBuffer, mimeType) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: bufferToStream(fileBuffer), // Convert buffer to stream
    },
    fields: 'id, webViewLink, webContentLink',
  });

  return res.data;
}