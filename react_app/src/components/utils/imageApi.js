// When deployed on Vercel the serverless route is under /api.
// If REACT_APP_API_URL is set it will be used (useful for local backend during development).
const BASE_URL = process.env.REACT_APP_API_URL || '/api';

function buildApiUrl(endpoint) {
  // endpoint should start with '/' e.g. '/generate' or '/folders/name/upload'
  const isProd = process.env.NODE_ENV === 'production';
  const needsJs = isProd && !endpoint.endsWith('.js');
  return `${BASE_URL}${endpoint}${needsJs ? '.js' : ''}`;
}

async function safeParseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('Failed to parse JSON response, returning raw text', err);
    return text;
  }
}

export async function generateImageFromAPI({ imageUrl, payload, driveFolderId, accessToken }) {
  const res = await fetch(buildApiUrl('/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, payload, driveFolderId, accessToken }),
  });

  console.log('Response from generateImageFromAPI:', res);

  if (!res.ok) {
    // Try to get error body if present, but don't assume it's JSON
    const parsed = await safeParseJson(res);
    const err = new Error(`Request failed with status ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }

  // Some endpoints may return binary (image) or JSON. Try to parse JSON safely.
  const parsed = await safeParseJson(res);
  return parsed;
}

export async function uploadImage({ imageUrl, driveFolderId, accessToken }) {
  const res = await fetch(buildApiUrl('/upload'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, driveFolderId, accessToken }),
  });

  if (!res.ok) {
    const parsed = await safeParseJson(res);
    const err = new Error(`Upload failed with status ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }

  return safeParseJson(res);
}