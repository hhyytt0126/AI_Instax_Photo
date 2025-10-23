// Lightweight generator for serverless environment: fetches image and returns raw buffer.
// Use the global fetch provided by Node 18+ to avoid external dependencies.
async function generateImage(imageUrl, payload) {
    try {
        const resp = await fetch(imageUrl);
        if (!resp.ok) throw new Error(`fetch failed with status ${resp.status}`);
        const arrBuf = await resp.arrayBuffer();
        const size = arrBuf.byteLength;
        const contentType = resp.headers.get('content-type');
        console.log('generator: fetched image', { url: imageUrl, size, contentType });
        return Buffer.from(arrBuf);
    } catch (err) {
        console.error('generator fetch error:', err?.message || err);
        throw err;
    }
}

export { generateImage };
