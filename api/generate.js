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

    // テスト用
    try {
        return res.status(200).json({
            success: true,
            message: 'API is working',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error in /api/generate:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
