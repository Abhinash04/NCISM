const axios = require('axios');
const config = require('../config');

class HealthController {
  async check(req, res) {
    try {
      const response = await axios.get(`${config.hybridServerUrl}/health`, { timeout: 5000 });
      if (response.status === 200) {
        return res.json({ status: 'online', message: 'Backend & Hybrid Server Online' });
      }
      throw new Error('Unexpected status code');
    } catch (error) {
      return res.status(503).json({ status: 'offline', message: 'Hybrid Server Offline', error: error.message });
    }
  }
}

module.exports = new HealthController();
