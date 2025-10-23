import axios from 'axios';

// Lightweight generator for serverless environment: fetches image and returns raw buffer.
// This avoids native dependencies (sharp) that often fail in serverless runtimes.
async function generateImage(imageUrl, payload) {
    try {
        const resp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
        console.log('generator: fetched image', { url: imageUrl, size: resp.data.byteLength, contentType: resp.headers['content-type'] });
        return Buffer.from(resp.data);
    } catch (err) {
        console.error('generator fetch error:', err?.message || err);
        throw err;
    }
}

export { generateImage };
