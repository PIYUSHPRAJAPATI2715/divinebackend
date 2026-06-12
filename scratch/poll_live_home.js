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
  const targetVersion = 'v1.0.2_donor_history_fix';
  const maxAttempts = 20;
  console.log(`Polling live home page API for version "${targetVersion}"...`);
  for (let i = 1; i <= maxAttempts; i++) {
    console.log(`Attempt ${i}/${maxAttempts} at ${new Date().toISOString()}`);
    const res = await fetchHome();
    if (res && res.data) {
      const currentVersion = res.data.appVersion || 'legacy';
      if (currentVersion === targetVersion) {
        console.log(`\nSUCCESS! Detected deployed version: "${currentVersion}"`);
        console.log(`NGOs count: ${res.data.ngos.length}`);
        console.log(`Recent Donations (donationHistory) count: ${res.data.donationHistory.length}`);
        res.data.donationHistory.forEach((item, idx) => {
          console.log(`  ${idx + 1}. Donor: ${item.user || item.donor}, NGO/Campaign: ${item.item}, Amount: ₹${item.amount}, Status: ${item.status}`);
        });
        return;
      } else {
        console.log(`Still running version "${currentVersion}".`);
      }
    } else {
      console.log('API request failed or returned invalid JSON.');
    }
    // Sleep 15 seconds
    await new Promise(r => setTimeout(r, 15000));
  }
  console.log('Polling finished without detecting target version.');
}

run().catch(console.error);
