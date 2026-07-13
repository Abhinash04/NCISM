const axios = require('axios');
const config = require('../config');

class HealthController {
  /**
   * In 'fast' extraction mode the engine is the local Java CLI — nothing to
   * probe, the API answering means extraction works. In 'hybrid' mode the
   * Docling server being down degrades service (extraction still falls back
   * to the base engine, so it is not a 503).
   */
  async check(req, res) {
    if (config.extractionMode !== 'hybrid') {
      return res.json({
        status: 'ok',
        message: 'All services online',
        services: { api: 'online', extractor: 'online' },
      });
    }

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
