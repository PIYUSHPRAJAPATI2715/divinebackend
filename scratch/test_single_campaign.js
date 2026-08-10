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
  console.log('--- 🧪 TESTING SINGLE CAMPAIGN DETAILS CREATOR & USER PROFILE FIX ---');

  await postRequest('/api/auth/login', { phone: '+919999900000', otp: '1234' });
  const verifyRes = await postRequest('/api/auth/verify-otp', { phone: '+919999900000', otp: '1234' });
  const token = verifyRes.body && (verifyRes.body.token || (verifyRes.body.data && verifyRes.body.data.token));

  const listRes = await makeRequest('/api/donor/campaigns', token);
  if (listRes.body && listRes.body.data && listRes.body.data.length > 0) {
    const targetCamp = listRes.body.data[0];
    const res = await makeRequest(`/api/donor/campaigns/${targetCamp._id}`, token);
    console.log('\nStatus:', res.status);
    if (res.body && res.body.data) {
      const data = res.body.data;
      console.log('   - user (creator name):', data.user);
      console.log('   - creatorName:', data.creatorName);
      console.log('   - profilePhoto:', data.profilePhoto);
      console.log('   - userImage:', data.userImage);
      console.log('   - userProfile object:', JSON.stringify(data.userProfile, null, 2));
    }
  } else {
    console.log('List body:', listRes.body);
  }

  process.exit(0);
}

run();
