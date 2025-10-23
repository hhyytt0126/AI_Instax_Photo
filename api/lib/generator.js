import axios from 'axios';

const url = process.env.SD_WEBUI_URL || "http://host.docker.internal:7860";

async function generateImage(imageUrl, payload) {
    try {
        // Simple implementation: forward payload to SD-WebUI txt2img endpoint.
        // Note: this avoids native deps like `sharp` to keep serverless compatibility.
        const res = await axios.post(
            `${url}/sdapi/v1/txt2img`,
            payload,
            { timeout: 300000, headers: { 'Content-Type': 'application/json' } }
        );

        if (!res.data || !res.data.images || !res.data.images.length) {
            throw new Error('画像が生成されませんでした');
        }

        const base64Out = res.data.images[0];
        return Buffer.from(base64Out, 'base64');
    } catch (err) {
        console.error('api/lib/generator error:', err);
        throw err;
    }
}

export { generateImage };
