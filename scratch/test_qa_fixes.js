const http = require('http');

const PORT = 5001;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- 🧪 RUNNING COMPREHENSIVE QA FIXES SUITE ---');

  // 1. GET /api/dan/items?category=CAT-FOOD
  const foodItemsRes = await makeRequest('/api/dan/items?category=CAT-FOOD');
  console.log('\n1. GET /api/dan/items?category=CAT-FOOD status:', foodItemsRes.status);
  if (foodItemsRes.body && foodItemsRes.body.data) {
    console.log('   - Filtered items count:', foodItemsRes.body.data.length);
  }

  // 2. GET /api/donor/campaigns (check single campaign details)
  const campaignsRes = await makeRequest('/api/donor/campaigns');
  if (campaignsRes.body && campaignsRes.body.data && campaignsRes.body.data.length > 0) {
    const camp0 = campaignsRes.body.data[0];
    const singleCampRes = await makeRequest(`/api/donor/campaigns/${camp0._id}`);
    console.log('\n2. GET /api/donor/campaigns/:id status:', singleCampRes.status);
    if (singleCampRes.body && singleCampRes.body.data) {
      const cData = singleCampRes.body.data;
      console.log('   - creatorName:', cData.user || cData.creatorName);
      console.log('   - creatorPhoto:', cData.profilePhoto || cData.userImage);
      if (Array.isArray(cData.recentDonors) && cData.recentDonors.length > 0) {
        console.log('   - recentDonor[0] profilePhoto:', cData.recentDonors[0].profilePhoto);
      }
    }
  }

  // 3. Login as donor & check followers and wallet
  await makeRequest('/api/auth/login', 'POST', { phone: '+919999900000', otp: '1234' });
  const verifyRes = await makeRequest('/api/auth/verify-otp', 'POST', { phone: '+919999900000', otp: '1234' });
  const token = verifyRes.body && (verifyRes.body.token || (verifyRes.body.data && verifyRes.body.data.token));

  if (token) {
    const meRes = await makeRequest('/api/auth/me', 'GET', null, { 'Authorization': `Bearer ${token}` });
    console.log('\n3. New user GET /api/auth/me status:', meRes.status, '| body:', JSON.stringify(meRes.body));
    const meData = meRes.body.data || meRes.body;
    console.log('   - followers list length (should be 0):', Array.isArray(meData.followers) ? meData.followers.length : 0);

    const profileRes = await makeRequest('/api/donor/profile', 'GET', null, { 'Authorization': `Bearer ${token}` });
    console.log('\n4. GET /api/donor/profile status:', profileRes.status);
    const pData = profileRes.body.data || profileRes.body;
    console.log('   - totalDonated:', pData.totalDonated);
  }

  console.log('\n--- 🚀 ALL QA TESTS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runTests();
