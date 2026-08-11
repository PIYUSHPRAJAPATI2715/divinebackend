const http = require('http');

const PORT = 5001;

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
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
  console.log('--- 🧪 TESTING NEW USER FOLLOWERS & FOLLOWING EMPTY STATE ---');

  // Register / Login new user with fresh phone
  const phone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;
  await postRequest('/api/auth/login', { phone, otp: '1234' });
  const verifyRes = await postRequest('/api/auth/verify-otp', { phone, otp: '1234' });
  const token = verifyRes.body && (verifyRes.body.token || (verifyRes.body.data && verifyRes.body.data.token));

  console.log(`\nNew User Registered (${phone}): Token obtained`);

  // 1. Test GET /api/donor/followers
  const donorFollowers = await makeRequest('/api/donor/followers', token);
  console.log('\n1. GET /api/donor/followers status:', donorFollowers.status);
  console.log('   - followers array length:', donorFollowers.body.followers ? donorFollowers.body.followers.length : 0);
  console.log('   - count:', donorFollowers.body.count);

  // 2. Test GET /api/followers
  const rootFollowers = await makeRequest('/api/followers', token);
  console.log('\n2. GET /api/followers status:', rootFollowers.status);
  console.log('   - followers array length:', rootFollowers.body.followers ? rootFollowers.body.followers.length : 0);

  // 3. Test GET /api/donor/following
  const donorFollowing = await makeRequest('/api/donor/following', token);
  console.log('\n3. GET /api/donor/following status:', donorFollowing.status);
  console.log('   - following array length:', donorFollowing.body.following ? donorFollowing.body.following.length : 0);

  // 4. Test GET /api/following
  const rootFollowing = await makeRequest('/api/following', token);
  console.log('\n4. GET /api/following status:', rootFollowing.status);
  console.log('   - following array length:', rootFollowing.body.following ? rootFollowing.body.following.length : 0);

  console.log('\n--- 🚀 FOLLOWERS & FOLLOWING TEST COMPLETE ---');
  process.exit(0);
}

run();
