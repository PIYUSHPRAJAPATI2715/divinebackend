const http = require('http');

const PORT = 5001;

function makeRequest(path, token = null) {
  return new Promise((resolve, reject) => {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method: 'GET',
      headers
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
    });
    req.on('error', reject);
    req.end();
  });
}

function postRequest(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
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
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('--- 🧪 TESTING FUNDRAISER NAME & IMAGE KEYS IN ADMIN & DONOR APIS ---');

  await postRequest('/api/auth/login', { phone: '+919999900000', otp: '1234' });
  const verifyRes = await postRequest('/api/auth/verify-otp', { phone: '+919999900000', otp: '1234' });
  const token = verifyRes.body && (verifyRes.body.token || (verifyRes.body.data && verifyRes.body.data.token));

  // 1. Test GET /api/admin/campaigns
  const adminCampRes = await makeRequest('/api/admin/campaigns', token);
  console.log('\n1. GET /api/admin/campaigns status:', adminCampRes.status);
  const adminData = adminCampRes.body.data || adminCampRes.body;
  if (Array.isArray(adminData) && adminData.length > 0) {
    const c0 = adminData[0];
    console.log('   - user:', c0.user);
    console.log('   - fundraiserName:', c0.fundraiserName);
    console.log('   - fundraiserImage:', c0.fundraiserImage);
    console.log('   - fundraiserProfile object:', JSON.stringify(c0.fundraiserProfile, null, 2));
  }

  // 2. Test GET /api/donor/campaigns
  const donorCampRes = await makeRequest('/api/donor/campaigns', token);
  console.log('\n2. GET /api/donor/campaigns status:', donorCampRes.status);
  if (donorCampRes.body && donorCampRes.body.data && donorCampRes.body.data.length > 0) {
    const c1 = donorCampRes.body.data[0];
    console.log('   - user:', c1.user);
    console.log('   - fundraiserName:', c1.fundraiserName);
    console.log('   - fundraiserImage:', c1.fundraiserImage);
    console.log('   - fundraiserProfile object:', JSON.stringify(c1.fundraiserProfile, null, 2));
  }

  console.log('\n--- 🚀 FUNDRAISER KEYS TEST COMPLETE ---');
  process.exit(0);
}

run();
