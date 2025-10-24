const fs = require('fs');
const path = require('path');

const baseFolder = path.join(__dirname, '..', 'uploads');

module.exports = (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);
    const folders = fs.readdirSync(baseFolder).filter(f => /^\d+$/.test(f));
    const max = folders.length > 0 ? Math.max(...folders.map(Number)) : 0;
    res.json({ latestFolderNumber: max });
};
