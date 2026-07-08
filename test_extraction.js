const path = require('path');
const openDataLoaderService = require('./backend/services/opendataloader.service.js');
const reconstructionService = require('./backend/services/reconstruction.service.js');

async function test() {
  const pdfPath = path.resolve('All data/Part-3 colleges/AYU0659 100 intake capacity.pdf');
  const outputDir = path.resolve('backend/temp/test_extract_' + Date.now());
  const fs = require('fs');
  fs.mkdirSync(outputDir, { recursive: true });
  
  console.log(`Starting extraction of ${pdfPath} to ${outputDir}...`);
  try {
    const result = await openDataLoaderService.execute(pdfPath, outputDir);
    console.log('Result:', result);
    
    // Check if input.json was created
    const jsonPath = path.join(outputDir, 'input.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      console.log(`JSON has ${data.pages?.length || 0} pages`);
    } else {
      console.log('input.json not found!');
    }
  } catch (err) {
    console.error('Extraction failed:', err);
  }
}

test();
