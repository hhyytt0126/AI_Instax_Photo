const BASE_URL = process.env.REACT_APP_API_URL || `${window.location.origin}/api`;

export async function generateImageFromAPI({ imageUrl, payload, driveFolderId, accessToken }) {
  const response = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, payload, driveFolderId, accessToken }),
  });
  console.log('Response from generateImageFromAPI:', response);
  return response.json();
}

export async function uploadImage({ imageUrl, driveFolderId, accessToken }) {
  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, driveFolderId, accessToken }),
  });
  return response.json();
}