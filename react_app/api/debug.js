// Minimal debug endpoint to verify function routing on Vercel.
// Use CommonJS export to avoid ESM transpilation differences.
module.exports = (req, res) => {
    try {
        console.log('react_app/api/debug invoked', { method: req.method, url: req.url, headers: req.headers });
    } catch (e) {
        console.log('react_app/api/debug invoked (logging failed)');
    }

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // try to parse string body if provided
    let body = req.body;
    if (typeof body === 'string' && body.length > 0) {
        try {
            body = JSON.parse(body);
        } catch (err) {
            // leave as string
        }
    }

    return res.json({
        ok: true,
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: body || null,
    });
};
