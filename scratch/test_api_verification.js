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
  console.log('--- 🧪 STARTING API VERIFICATION TESTS ---');

  // 1. GET /api/home
  const homeRes = await makeRequest('/api/home');
  console.log('\n1. GET /api/home status:', homeRes.status);
  if (homeRes.body && homeRes.body.data) {
    const { categories, campaigns } = homeRes.body.data;
    console.log(`   - Categories count: ${categories.length}`);
    if (categories.length > 0) {
      console.log(`   - Category[0]: name="${categories[0].name}", imageUrl="${categories[0].imageUrl}"`);
    }
    console.log(`   - Campaigns count: ${campaigns.length}`);
    if (campaigns.length > 0) {
      console.log(`   - Campaign[0]: title="${campaigns[0].title}", imageUrl="${campaigns[0].imageUrl}"`);
    }
  }

  // 2. Login as NGO to test profile
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    phone: '+919870961933',
    otp: '123456'
  });

  console.log('   - loginRes.body:', loginRes.body);
  let token = loginRes.body && (loginRes.body.token || (loginRes.body.data && loginRes.body.data.token));
  console.log('   - Token retrieved:', !!token);

  if (token) {
    // 3. Test GET /api/ngo/profile
    const ngoProfile = await makeRequest('/api/ngo/profile', 'GET', null, {
      'Authorization': `Bearer ${token}`
    });
    console.log('\n3. GET /api/ngo/profile status:', ngoProfile.status);
    const data = ngoProfile.body.data || ngoProfile.body;
    console.log('   - reviewCount:', data.reviewCount);
    console.log('   - reviews count:', Array.isArray(data.reviews) ? data.reviews.length : 0);
    console.log('   - impact:', data.impact);
    console.log('   - followersCount:', data.followersCount);
    console.log('   - years:', data.years);
    console.log('   - rating:', data.rating);

    // 4. Test GET /api/ngos/profile (Legacy route)
    const legacyNgoProfile = await makeRequest('/api/ngos/profile', 'GET', null, {
      'Authorization': `Bearer ${token}`
    });
    console.log('\n4. GET /api/ngos/profile status:', legacyNgoProfile.status);
    const legacyData = legacyNgoProfile.body.data || legacyNgoProfile.body;
    console.log('   - reviewCount:', legacyData.reviewCount);
    console.log('   - reviews count:', Array.isArray(legacyData.reviews) ? legacyData.reviews.length : 0);
    console.log('   - impact:', legacyData.impact);
    console.log('   - followersCount:', legacyData.followersCount);
    console.log('   - years:', legacyData.years);
    console.log('   - rating:', legacyData.rating);

    // 5. Test GET /api/auth/me
    const meRes = await makeRequest('/api/auth/me', 'GET', null, {
      'Authorization': `Bearer ${token}`
    });
    console.log('\n5. GET /api/auth/me status:', meRes.status);
    const meData = meRes.body.data || meRes.body;
    console.log('   - reviewCount:', meData.reviewCount);
    console.log('   - reviews count:', Array.isArray(meData.reviews) ? meData.reviews.length : 0);
    console.log('   - impact:', meData.impact);
    console.log('   - followersCount:', meData.followersCount);
    console.log('   - years:', meData.years);
    console.log('   - rating:', meData.rating);
  }

  console.log('\n--- 🚀 VERIFICATION COMPLETE ---');
  process.exit(0);
}

runTests();
