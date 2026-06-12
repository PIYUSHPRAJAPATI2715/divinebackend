const http = require('https');

function fetchHome() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'divinebackend-v5gl.onrender.com',
      path: '/api/home',
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', (err) => { resolve(null); });
    req.end();
  });
}

async function run() {
  const maxAttempts = 15;
  console.log(`Polling live home page API... (up to ${maxAttempts} attempts)`);
  for (let i = 1; i <= maxAttempts; i++) {
    console.log(`Attempt ${i}/${maxAttempts} at ${new Date().toISOString()}`);
    const res = await fetchHome();
    if (res && res.data) {
      if (res.data.appVersion) {
        console.log(`SUCCESS! Detected deployed version: "${res.data.appVersion}"`);
        console.log(`NGOs returned: ${res.data.ngos.length}`);
        res.data.ngos.forEach(n => console.log(`  - ${n.name}`));
        return;
      } else {
        console.log(`Still running old version. NGOs returned: ${res.data.ngos ? res.data.ngos.length : 'N/A'}`);
      }
    } else {
      console.log('API request failed or returned invalid JSON.');
    }
    // Sleep 15 seconds before next attempt
    await new Promise(r => setTimeout(r, 15000));
  }
  console.log('Polling finished without detecting deployment.');
}

run().catch(console.error);
