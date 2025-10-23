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
    // CORSヘッダーを追加
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONSリクエストに応答
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // POST以外は拒否
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // テスト用（backend/generatorなしでまずテストする）
    try {
        return res.status(200).json({
            success: true,
            message: 'API is working'
        });
    } catch (err) {
        console.error('Error in /api/generate:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
