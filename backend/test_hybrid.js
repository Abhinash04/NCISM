const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const PDF_PATH = 'D:\\Anuvadini\\NCISM\\All data\\Part-3 colleges\\AYU0659 100 intake capacity.pdf';
const HYBRID_URL = 'http://localhost:5002/v1/convert/file';
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'response.json');

async function test() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
  }

  const form = new FormData();
  form.append('files', fs.createReadStream(PDF_PATH), {
    filename: path.basename(PDF_PATH),
    contentType: 'application/pdf',
  });

  console.log(`Sending to ${HYBRID_URL}...`);
  try {
    const response = await axios.post(HYBRID_URL, form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(response.data, null, 2));
    console.log(`Response saved to ${LOG_FILE}`);
  } catch (err) {
    console.error('Error calling Hybrid Server:', err.message);
  }
}

test();
