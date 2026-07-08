const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class OpenDataLoaderService {
  /**
   * Executes the OpenDataLoader CLI
   * @param {string} inputPdfPath - Path to the PDF file to process
   * @param {string} outputDir - Directory to store output artifacts
   * @returns {Promise<void>}
   */
  execute(inputPdfPath, outputDir) {
    return new Promise((resolve, reject) => {
      // Allow overriding the CLI path via environment variable, otherwise fallback to known path
      const cliPath = process.env.OPENDATALOADER_CLI_PATH || 'D:\\opendataloader-pdf\\.venv\\Scripts\\opendataloader-pdf.exe';
      
      const args = [
        '-f', 'markdown,json,html',
        '--hybrid', 'docling-fast',
        '--hybrid-fallback',
        '--markdown-with-html',
        '-o', outputDir,
        inputPdfPath
      ];

      console.log(`[OpenDataLoader] Executing: ${cliPath} ${args.join(' ')}`);

      const child = spawn(cliPath, args, { shell: false });

      let stdoutLog = '';
      
      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdoutLog += text;
        console.log(`[OpenDataLoader stdout]: ${text.trim()}`);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stdoutLog += text;
        console.error(`[OpenDataLoader stderr]: ${text.trim()}`);
      });

      child.on('error', (error) => {
        console.error(`[OpenDataLoader] Failed to start subprocess: ${error.message}`);
        reject(error);
      });

      child.on('close', (code) => {
        console.log(`[OpenDataLoader] Process exited with code ${code}`);
        
        let status = 'success';
        let failedPages = [];
        let warnings = [];

        if (stdoutLog.includes('partial_success')) {
            status = 'partial_success';
            
            // Extract reasons from "Backend returned partial_success: [...]"
            const match = stdoutLog.match(/partial_success:\s*(\[[^\]]+\])/);
            if (match) {
                try {
                    const reasons = JSON.parse(match[1]);
                    const uniqueReasons = [...new Set(reasons)];
                    warnings.push(`Extraction incomplete. Reasons: ${uniqueReasons.join(', ')}`);
                } catch (e) {
                    warnings.push('Extraction incomplete due to backend errors.');
                }
            } else {
                warnings.push('Docling backend returned partial success.');
            }
        }

        const jsonFileName = path.basename(inputPdfPath, '.pdf') + '.json';
        const jsonFallbackPath = path.join(outputDir, jsonFileName);
        const jsonPath = fs.existsSync(path.join(outputDir, 'input.json')) 
            ? path.join(outputDir, 'input.json') 
            : jsonFallbackPath;

        const mdFileName = path.basename(inputPdfPath, '.pdf') + '.md';
        const mdFallbackPath = path.join(outputDir, mdFileName);
        const mdPath = fs.existsSync(path.join(outputDir, 'input.md'))
            ? path.join(outputDir, 'input.md')
            : mdFallbackPath;

        if (code === 0 || status === 'partial_success') {
          // Detect missing pages from JSON if partial_success
          if (status === 'partial_success' && fs.existsSync(jsonPath)) {
              try {
                  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                  const totalPagesMatch = stdoutLog.match(/Number of pages:\s*(\d+)/);
                  const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1]) : 0;
                  
                  if (totalPages > 0 && data.pages) {
                      const presentPages = new Set(Object.keys(data.pages).map(Number));
                      for (let i = 1; i <= totalPages; i++) {
                          if (!presentPages.has(i)) {
                              failedPages.push(i);
                          }
                      }
                  }
              } catch (e) {
                  console.error('[OpenDataLoader] Failed to parse JSON to find missing pages:', e);
              }
          }

          try {
            const reconstructionService = require('./reconstruction.service.js');
            console.log(`[OpenDataLoader] Triggering Semantic Reconstruction Layer...`);
            reconstructionService.reconstruct(jsonPath, mdPath);
          } catch (e) {
            console.error(`[OpenDataLoader] Semantic reconstruction failed:`, e);
          }
          resolve({ status, warnings, failedPages });
        } else {
          reject(new Error(`OpenDataLoader CLI exited with code ${code}`));
        }
      });
    });
  }
}

module.exports = new OpenDataLoaderService();
