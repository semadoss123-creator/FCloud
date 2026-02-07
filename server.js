
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = 3000;

// Check if required files and folders exist
const PUBLIC_DIR = path.join(__dirname, 'public');
const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(PUBLIC_DIR)) {
    console.error('ERROR: public folder does not exist!');
    console.error('Please run setup.bat first.');
    process.exit(1);
}

if (!fs.existsSync(INDEX_FILE)) {
    console.error('ERROR: index.html not found in public folder!');
    console.error('Please run setup.bat first.');
    process.exit(1);
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIP();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let targetDir = UPLOAD_DIR;
        if (req.body.path) {
            targetDir = path.join(UPLOAD_DIR, req.body.path);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
        }
        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        let filename = file.originalname;
        let filePath = path.join(req.body.path ? path.join(UPLOAD_DIR, req.body.path) : UPLOAD_DIR, filename);
        
        let counter = 1;
        while (fs.existsSync(filePath)) {
            const ext = path.extname(filename);
            const name = path.basename(filename, ext);
            filename = `${name} (${counter})${ext}`;
            filePath = path.join(req.body.path ? path.join(UPLOAD_DIR, req.body.path) : UPLOAD_DIR, filename);
            counter++;
        }
        
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000 * 1024 * 1024 * 1024 } // 10000GB 
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(PUBLIC_DIR));

app.get('/', (req, res) => {
    res.sendFile(INDEX_FILE);
});

app.get('/api/files', (req, res) => {
    try {
        const relativePath = req.query.path || '';
        const fullPath = path.join(UPLOAD_DIR, relativePath);

        if (!fullPath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Folder does not exist' });
        }
        
        const files = fs.readdirSync(fullPath, { withFileTypes: true });
        const fileList = files.map(file => {
            const filePath = path.join(fullPath, file.name);
            const stats = fs.statSync(filePath);
            
            return {
                name: file.name,
                type: file.isDirectory() ? 'folder' : 'file',
                size: file.isDirectory() ? 0 : stats.size,
                modified: stats.mtime,
                path: path.join(relativePath, file.name).replace(/\\/g, '/')
            };
        });

        fileList.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
        
        res.json(fileList);
    } catch (error) {
        console.error('Error getting files:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload', upload.array('files'), (req, res) => {
    try {
        const uploadedFiles = req.files.map(file => ({
            name: file.filename,
            size: file.size,
            path: path.relative(UPLOAD_DIR, file.path).replace(/\\/g, '/')
        }));
        
        res.json({ 
            success: true, 
            message: `Successfully uploaded ${uploadedFiles.length} files`,
            files: uploadedFiles 
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/download', (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ error: 'File path not specified' });
        }
        
        const fullPath = path.join(UPLOAD_DIR, filePath);

        if (!fullPath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            return res.status(400).json({ error: 'This is a folder, use folder download' });
        }
        
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fullPath)}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', stats.size);
        
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/download-folder', (req, res) => {
    try {
        const folderPath = req.query.path;
        if (!folderPath) {
            return res.status(400).json({ error: 'Folder path not specified' });
        }
        
        const fullPath = path.join(UPLOAD_DIR, folderPath);

        if (!fullPath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        
        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'This is not a folder' });
        }
        
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fullPath)}.zip"`);
        res.setHeader('Content-Type', 'application/zip');
        
        archive.on('error', (err) => {
            console.error('Archiving error:', err);
            res.status(500).send('Error creating archive');
        });
        
        archive.pipe(res);
        archive.directory(fullPath, false);
        archive.finalize();
        
    } catch (error) {
        console.error('Error downloading folder:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/delete', (req, res) => {
    try {
        const { path: itemPath, type } = req.query;
        
        if (!itemPath) {
            return res.status(400).json({ error: 'Path not specified' });
        }
        
        const fullPath = path.join(UPLOAD_DIR, itemPath);
        
        if (!fullPath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File/folder not found' });
        }
        
        if (type === 'folder') {
            fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(fullPath);
        }
        
        res.json({ success: true, message: 'Successfully deleted' });
    } catch (error) {
        console.error('Error deleting:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rename', (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        
        if (!oldPath || !newName) {
            return res.status(400).json({ error: 'Parameters not specified' });
        }
        
        const safeNewName = newName.replace(/[\\/:*?"<>|]/g, '_');
        const oldFullPath = path.join(UPLOAD_DIR, oldPath);
        const newFullPath = path.join(path.dirname(oldFullPath), safeNewName);
        
        if (!oldFullPath.startsWith(UPLOAD_DIR) || !newFullPath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(oldFullPath)) {
            return res.status(404).json({ error: 'File/folder not found' });
        }
        
        if (fs.existsSync(newFullPath)) {
            return res.status(400).json({ error: 'A file/folder with this name already exists' });
        }
        
        fs.renameSync(oldFullPath, newFullPath);
        
        const newRelativePath = path.relative(UPLOAD_DIR, newFullPath).replace(/\\/g, '/');
        res.json({ success: true, newPath: newRelativePath });
    } catch (error) {
        console.error('Error renaming:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/server-info', (req, res) => {
    res.json({
        ip: LOCAL_IP,
        port: PORT,
        uploadDir: UPLOAD_DIR,
        urls: {
            local: `http://localhost:${PORT}`,
            network: `http://${LOCAL_IP}:${PORT}`
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║               File Manager is running                     ║
╠═══════════════════════════════════════════════════════════╣
║ Local access: http://localhost:${PORT}                    ║
║ Network access: http://${LOCAL_IP}:${PORT}                ║
║ Uploads folder: ${UPLOAD_DIR}                             ║
╚═══════════════════════════════════════════════════════════╝
`);
    console.log('Press Ctrl+C to stop the server');
});

// Handle termination signal (Ctrl+C)
process.on('SIGINT', () => {
    console.log('\nServer stopped.');
    process.exit(0);
});
