module.exports = async (req, res) => {
    try {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
        const { imageUrl, payload, driveFolderId, accessToken } = req.body;

        // Import ESM generator dynamically
        const genMod = await import('../generator.js');
        const generateImage = genMod.generateImage || genMod.default?.generateImage;

        // Import upload helper (ESM)
        const uploadMod = await import('../lib/uploadFileToDrive.js');
        const uploadFileToDrive = uploadMod.uploadFileToDrive || uploadMod.default?.uploadFileToDrive;

        const imageBuffer = await generateImage(imageUrl, payload);

        const timestamp = Date.now();
        const fileName = `${timestamp}-AIphoto.jpg`;

        const uploaded = await uploadFileToDrive(
            accessToken,
            driveFolderId,
            fileName,
            imageBuffer,
            'image/jpg'
        );

        res.json({
            success: true,
            fileId: uploaded.id,
            fileName: uploaded.name,
            mimeType: uploaded.mimeType,
            webViewLink: uploaded.webViewLink,
            webContentLink: uploaded.webContentLink,
            parents: uploaded.parents,
        });
    } catch (err) {
        console.error('Error in /api/generate:', err);
        res.status(500).json({ error: err.message });
    }
};
