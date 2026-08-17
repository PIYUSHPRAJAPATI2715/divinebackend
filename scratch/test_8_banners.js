const http = require('http');

// Require server directly so we test the exact running code
require('../server.js');

setTimeout(async () => {
  console.log('\n--- 🧪 TESTING UNIFIED SCREEN BANNER APIS ---');

  function get(path) {
    return new Promise((resolve, reject) => {
      http.get({
        hostname: 'localhost',
        port: 5001,
        path
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, body: json });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }).on('error', reject);
    });
  }

  const screens = ['home', 'donate', 'daan_category', 'campaign_list', 'following_list', 'campaign_details'];

  for (const sName of screens) {
    const res = await get(`/api/banners/screen/${sName}`);
    console.log(`\nScreen: "${sName}" (Status: ${res.status}):`);
    console.log(`   Page: ${res.body?.page}`);
    console.log(`   Top Banners Count: ${res.body?.top?.length || 0}`);
    if (res.body?.topBanner) {
      console.log(`     -> Top Banner Title: "${res.body.topBanner.title}" [${res.body.topBanner.mediaType}]`);
    } else {
      console.log(`     -> Top Banner: None`);
    }

    console.log(`   Bottom Banners Count: ${res.body?.bottom?.length || 0}`);
    if (res.body?.bottomBanner) {
      console.log(`     -> Bottom Banner Title: "${res.body.bottomBanner.title}" [${res.body.bottomBanner.mediaType}]`);
    } else {
      console.log(`     -> Bottom Banner: None`);
    }
  }

  console.log('\n--- 🧪 TESTING GET ALL SCREENS MAP (GET /api/banners/screens) ---');
  const allMapRes = await get('/api/banners/screens');
  console.log('Status:', allMapRes.status);
  console.log('Available Screens in Map:', Object.keys(allMapRes.body?.screens || {}));

  process.exit(0);
}, 3000);
