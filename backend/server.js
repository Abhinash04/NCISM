const express = require('express');
const cors = require('cors');
const extractRoutes = require('./routes/extract.routes');
const jobRoutes = require('./routes/job.routes');
const axios = require('axios'); // Only needed for health check now

const app = express();
const port = process.env.PORT || 3000;
const HYBRID_SERVER_URL = process.env.HYBRID_SERVER_URL || 'http://localhost:5002';

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());

// Health Check Endpoint
app.get('/api/v1/health', async (req, res) => {
    try {
        const response = await axios.get(`${HYBRID_SERVER_URL}/health`, { timeout: 5000 });
        if (response.status === 200) {
            return res.json({ status: 'online', message: 'Backend & Hybrid Server Online' });
        }
        throw new Error('Unexpected status code');
    } catch (error) {
        return res.status(503).json({ status: 'offline', message: 'Hybrid Server Offline', error: error.message });
    }
});

// API Routes
app.use('/api/v1', extractRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/assessment', require('./routes/assessment.route'));

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
    console.log(`Using Hybrid Server at ${HYBRID_SERVER_URL} for CLI processing.`);
});
