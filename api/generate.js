import { generateImage } from '../backend/generator';

export default async function handler(req, res) {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
            headers: req.headers,
            url: req.url,
            path: req.path,
        });
    }

    try {
        const { imageUrl, payload } = req.body;
        if (!imageUrl || !payload) {
            return res.status(400).json({ error: 'Missing required fields: imageUrl or payload' });
        }

        const imageBuffer = await generateImage(imageUrl, payload);
        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(imageBuffer);
    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

