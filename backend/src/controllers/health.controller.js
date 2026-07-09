const axios = require('axios');
const config = require('../config');

class HealthController {
  /**
   * The API itself answering means it is online; the extractor (hybrid
   * server) being down degrades service but is not a 503 — extraction can
   * still fall back to the base engine.
   */
  async check(req, res) {
    let extractor = 'offline';
    try {
      const response = await axios.get(`${config.hybridServerUrl}/health`, { timeout: 5000 });
      if (response.status === 200) extractor = 'online';
    } catch {
      extractor = 'offline';
    }

    const status = extractor === 'online' ? 'ok' : 'degraded';
    res.json({
      status,
      message: status === 'ok' ? 'All services online' : 'Hybrid server offline — extraction runs in fallback mode',
      services: { api: 'online', extractor },
    });
  }
}

module.exports = new HealthController();
