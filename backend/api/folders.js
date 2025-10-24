const fs = require('fs');
const path = require('path');

const baseFolder = path.join(__dirname, '..', 'uploads');

module.exports = (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { folderName } = req.body;
    const folderPath = path.join(baseFolder, folderName);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    res.json({ success: true });
};
