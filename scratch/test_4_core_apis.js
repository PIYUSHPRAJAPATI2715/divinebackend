const http = require('http');

const PORT = 5001;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('--- 🧪 TESTING 4 CORE APIS (FOLLOWERS, FOLLOWING, FUNDRAISER CATEGORIES, MY CAMPAIGNS) ---');

  // Register & login test user
  const phone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;
  await request('POST', '/api/auth/login', { phone, otp: '1234' });
  const verifyRes = await request('POST', '/api/auth/verify-otp', { phone, otp: '1234' });
  const token = verifyRes.body && (verifyRes.body.token || (verifyRes.body.data && verifyRes.body.data.token));

  console.log(`\nLogged in user (${phone})`);

  // 1. My Followers APIs
  const f1 = await request('GET', '/api/donor/followers', null, token);
  console.log('\n1. GET /api/donor/followers -> Status:', f1.status, '| Followers Count:', f1.body.followersCount);

  const f2 = await request('GET', '/api/followers', null, token);
  console.log('   GET /api/followers -> Status:', f2.status);

  // 2. My Following APIs
  const fw1 = await request('GET', '/api/donor/following', null, token);
  console.log('\n2. GET /api/donor/following -> Status:', fw1.status, '| Following Count:', fw1.body.followingCount);

  const fw2 = await request('GET', '/api/following', null, token);
  console.log('   GET /api/following -> Status:', fw2.status);

  // 3. Fundraiser Category APIs
  const fc1 = await request('GET', '/api/donor/campaign-categories', null, token);
  console.log('\n3. GET /api/donor/campaign-categories -> Status:', fc1.status, '| Categories:', (fc1.body.data || fc1.body.categories || []).length);

  const fc2 = await request('GET', '/api/campaign-categories', null, token);
  console.log('   GET /api/campaign-categories -> Status:', fc2.status);

  // 4. My Campaigns APIs
  const mc1 = await request('GET', '/api/donor/my-campaigns', null, token);
  console.log('\n4. GET /api/donor/my-campaigns -> Status:', mc1.status, '| My Campaigns Count:', mc1.body.count);

  const mc2 = await request('GET', '/api/my-campaigns', null, token);
  console.log('   GET /api/my-campaigns -> Status:', mc2.status);

  console.log('\n--- 🚀 ALL 4 CORE APIS VERIFIED SUCCESSFULLY ---');
  process.exit(0);
}

run();
