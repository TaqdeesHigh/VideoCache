const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const fsPromises = require('fs').promises;
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const allowedMimeTypes = [
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mpeg', 'audio/ogg', 'audio/wav'
];
  
const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        try {
          await fsPromises.access(uploadDir);
        } catch (error) {
          await fsPromises.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
});
  
const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'), false);
    }
};
  
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
}).single('video');
  

async function saveDownloadLink(fileId, downloadLink, fileName, fileSize) {
    const dataDir = path.join(__dirname, 'data');
    const filePath = path.join(dataDir, 'download_links.json');

    try {
        await fsPromises.mkdir(dataDir, { recursive: true });

        let links = [];
        try {
            const data = await fsPromises.readFile(filePath, 'utf8');
            links = JSON.parse(data);
        } catch (error) {
            // File doesn't exist or is empty, start with an empty array
        }

        links.push({
            fileId,
            downloadLink,
            fileName,
            fileSize,
            date: new Date().toISOString()
        });

        await fsPromises.writeFile(filePath, JSON.stringify(links, null, 2));
    } catch (error) {
        console.error('Error saving download link:', error);
    }
}

app.post('/upload', (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'File upload error', message: err.message });
        } else if (err) {
            if (err.message === 'INVALID_FILE_TYPE') {
                return res.status(400).json({ error: 'Invalid file type', message: 'Only video and audio files are allowed.' });
            }
            return res.status(500).json({ error: 'Server error', message: 'An unexpected error occurred.' });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file', message: 'No file was uploaded.' });
        }

        const fileId = crypto.randomBytes(16).toString('hex');
        const downloadLink = `/download/${fileId}`;

        app.locals.files = app.locals.files || {};
        app.locals.files[fileId] = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size
        };

        saveDownloadLink(fileId, downloadLink, req.file.originalname, req.file.size)
            .then(() => res.json({ downloadLink }))
            .catch(error => {
                console.error('Error saving download link:', error);
                res.status(500).json({ error: 'Server error', message: 'Failed to save download link.' });
            });
    });
});

app.get('/get-download-links', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'download_links.json');
        let links = [];
        try {
            const data = await fsPromises.readFile(filePath, { encoding: 'utf8' });
            links = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            // File doesn't exist, return an empty array
        }
        res.json(links);
    } catch (error) {
        console.error('Error reading download links:', error);
        res.status(500).json({ error: 'Unable to retrieve download links' });
    }
});

app.get('/download/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileInfo = app.locals.files[fileId];

  if (!fileInfo) {
    return res.status(404).send('File not found');
  }

  res.download(fileInfo.path, fileInfo.originalName);
});

app.delete('/delete-link/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileInfo = app.locals.files[fileId];
        if (fileInfo) {
            await fsPromises.unlink(fileInfo.path);
            delete app.locals.files[fileId];
        }
        await deleteDownloadLink(fileId);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error deleting file and link:', error);
        res.status(500).json({ error: 'Unable to delete file and download link' });
    }
});

async function deleteDownloadLink(fileId) {
    const dataDir = path.join(__dirname, 'data');
    const filePath = path.join(dataDir, 'download_links.json');

    try {
        const data = await fsPromises.readFile(filePath, 'utf8');
        let links = JSON.parse(data);
        links = links.filter(link => link.fileId !== fileId);
        await fsPromises.writeFile(filePath, JSON.stringify(links, null, 2));
    } catch (error) {
        console.error('Error deleting download link:', error);
        throw error;
    }
}

app.delete('/clear-all-links', async (req, res) => {
    try {
        await clearAllDownloadLinks();
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: 'Unable to clear all download links' });
    }
});

async function clearAllDownloadLinks() {
    const dataDir = path.join(__dirname, 'data');
    const filePath = path.join(dataDir, 'download_links.json');

    try {
        await fsPromises.writeFile(filePath, JSON.stringify([], null, 2));
    } catch (error) {
        console.error('Error clearing all download links:', error);
        throw error;
    }
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});