const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const HYBRID_SERVER_URL = process.env.HYBRID_SERVER_URL || 'http://localhost:5002';

app.use(cors());
app.use(express.json());

// Set up Multer for handling file uploads (storing temporarily on disk)
const upload = multer({ dest: 'uploads/' });

// Health Check Endpoint
app.get('/api/v1/health', async (req, res) => {
    try {
        const response = await axios.get(`${HYBRID_SERVER_URL}/health`, { timeout: 5000 });
        if (response.status === 200) {
            return res.json({ status: 'online', message: 'Hybrid Server Online' });
        }
        throw new Error('Unexpected status code');
    } catch (error) {
        return res.status(503).json({ status: 'offline', message: 'Hybrid Server Offline', error: error.message });
    }
});

// Extract Endpoint
app.post('/api/v1/extract', upload.single('files'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const startTime = Date.now();

    try {
        const form = new FormData();
        form.append('files', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(`${HYBRID_SERVER_URL}/v1/convert/file`, form, {
            headers: {
                ...form.getHeaders(),
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        const processingTime = Date.now() - startTime;

        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);

        // Normalized Response
        const normalizedResponse = {
            success: true,
            document: {
                json: response.data,
                markdown: null,
                html: null,
                raw: response.data
            },
            metadata: {
                filename: req.file.originalname,
                filesize: req.file.size,
                pages: response.data?.num_pages || 0, // Fallback if not available
                processingTime: processingTime,
                version: "1.0.0" // Mocked until backend provides
            },
            capabilities: {
                json: true,
                markdown: false,
                html: false
            }
        };

        return res.json(normalizedResponse);
    } catch (error) {
        // Clean up on error
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error("Extraction error:", error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data || 'Error connecting to Hybrid Server'
            });
        }
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
    console.log(`Proxying to Hybrid Server at ${HYBRID_SERVER_URL}`);
});
