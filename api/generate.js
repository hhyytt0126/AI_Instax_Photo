import { generateImage } from '../backend/generator';
import { google } from 'googleapis';
import { Readable } from 'stream';

function bufferToStream(buffer) {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
}

export default async function handler(req, res) {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Log incoming request info to help debug 405 issues on Vercel
    try {
        console.log('api/generate invoked:', { method: req.method, url: req.url, headers: req.headers });
    } catch (e) {
        console.log('api/generate invoked (logging failed)');
    }

    // OPTIONSリクエストに応答
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POSTのみ許可
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method Not Allowed',
            received_method: req.method,
            allowed_methods: ['POST', 'OPTIONS'],
            message: `Expected POST, but received ${req.method}`,
        });
    }

    try {
        // Ensure body is parsed (Vercel may provide string body in some setups)
        let body = req.body;
        if (typeof body === 'string' && body.length > 0) {
            try {
                body = JSON.parse(body);
            } catch (err) {
                console.warn('api/generate: failed to JSON.parse req.body string');
            }
        }

        const { imageUrl, payload, driveFolderId, accessToken } = body || {};
        if (!imageUrl || !payload) {
            return res.status(400).json({ error: 'Missing required fields: imageUrl or payload' });
        }

        console.log('api/generate request:', { imageUrl, driveFolderId });

        const imageBuffer = await generateImage(imageUrl, payload);

        // If Drive upload info is provided, upload and return metadata
        if (driveFolderId && accessToken) {
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: accessToken });
            const drive = google.drive({ version: 'v3', auth });

            const timestamp = Date.now();
            const fileName = `${timestamp}-AIphoto.jpg`;

            const uploaded = await drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [driveFolderId],
                    mimeType: 'image/jpeg',
                },
                media: {
                    mimeType: 'image/jpeg',
                    body: bufferToStream(imageBuffer),
                },
                fields: 'id, name, mimeType, webViewLink, webContentLink, parents',
            });

            const data = uploaded.data || {};
            return res.json({
                success: true,
                fileId: data.id,
                fileName: data.name,
                mimeType: data.mimeType,
                webViewLink: data.webViewLink,
                webContentLink: data.webContentLink,
                parents: data.parents,
            });
        }

        // If Drive info not provided, return base64 image as JSON (caller can handle)
        const base64 = imageBuffer.toString('base64');
        return res.json({ success: true, image: base64 });

    } catch (error) {
        console.error('Error in /api/generate:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

