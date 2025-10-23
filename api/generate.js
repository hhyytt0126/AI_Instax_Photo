import { generateImage } from '../backend/generator';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

function bufferToStream(buffer) {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
}

async function uploadFileToDrive(accessToken, folderId, fileName, buffer, mimeType) {
    if (!accessToken) throw new Error('Google Drive のアクセストークンが指定されていません');
    const form = new FormData();
    form.append('metadata', JSON.stringify({ name: fileName, parents: [folderId] }), {
        contentType: 'application/json',
    });
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

export default async function handler(req, res) {
    try {
        const { imageUrl, payload, driveFolderId, accessToken } = req.body;
        const imageBuffer = await generateImage(imageUrl, payload);
        const timestamp = Date.now();
        const fileName = `${timestamp}-AIphoto.jpg`;
        const uploaded = await uploadFileToDrive(
            accessToken,
            driveFolderId,
            fileName,
            imageBuffer,
            'image/jpg'
        );
        res.status(200).json({
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
}
