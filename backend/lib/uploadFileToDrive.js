import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

function bufferToStream(buffer) {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
}

export async function uploadFileToDrive(accessToken, folderId, fileName, buffer, mimeType) {
    if (!accessToken) throw new Error('Google Drive access token is required');
    const form = new FormData();
    form.append('metadata', JSON.stringify({ name: fileName, parents: [folderId] }), {
        contentType: 'application/json',
    });
    form.append('file', bufferToStream(buffer), {
        filename: fileName,
        contentType: mimeType,
    });

    const res = await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        form,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...form.getHeaders(),
            },
            maxBodyLength: Infinity,
        }
    );
    return res.data;
}
