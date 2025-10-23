// /api/generate.js

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
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // テストレスポンス
    return res.status(200).json({
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString(),
    });
}

