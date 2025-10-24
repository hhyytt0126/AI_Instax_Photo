const url = process.env.SD_WEBUI_URL || "http://host.docker.internal:7860";

async function generateImage(imageUrl, payload) {
    try {
        // Use the global fetch available in modern Node versions instead of axios
        // to avoid depending on axios being present in the function bundle.
        const res = await fetch(`${url}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => null);
            throw new Error(`SD-WebUI responded with ${res.status}: ${text}`);
        }

        const data = await res.json();
        if (!data || !data.images || !data.images.length) {
            throw new Error('画像が生成されませんでした');
        }

        const base64Out = data.images[0];
        return Buffer.from(base64Out, 'base64');
    } catch (err) {
        console.error('api/lib/generator error:', err && (err.stack || err.message || err));
        throw err;
    }
}

export { generateImage };
