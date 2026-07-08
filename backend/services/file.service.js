const fs = require('fs');
const path = require('path');

class FileService {
  /**
   * Scans the output directory and loads generated artifacts dynamically based on file extensions.
   * @param {string} outputDir - Directory to scan
   * @returns {Object} Artifacts mapping
   */
  collectArtifacts(outputDir) {
    const artifacts = {
      markdown: null,
      json: null,
      html: null,
      text: null,
      raw: null
    };

    if (!fs.existsSync(outputDir)) {
      return artifacts;
    }

    const files = fs.readdirSync(outputDir);

    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const ext = path.extname(file).toLowerCase();
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');

        if (ext === '.md') {
          artifacts.markdown = content;
        } else if (ext === '.json') {
          artifacts.json = JSON.parse(content);
        } else if (ext === '.html') {
          artifacts.html = content;
        } else if (ext === '.txt') {
          artifacts.text = content;
        }
      } catch (err) {
        console.error(`[FileService] Failed to read artifact ${file}:`, err.message);
      }
    }

    return artifacts;
  }
}

module.exports = new FileService();
