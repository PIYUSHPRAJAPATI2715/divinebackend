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
  console.log('--- 🧪 TESTING FUNDRAISER CATEGORY APIS & NGO PHONE NUMBER ---');

  // Login
  const loginRes = await request('POST', '/api/auth/login', { phone: '+919999900000', otp: '1234' });
  const verifyRes = await request('POST', '/api/auth/verify-otp', { phone: '+919999900000', otp: '1234' });
  const token = verifyRes.body && (verifyRes.body.token || (verifyRes.body.data && verifyRes.body.data.token));

  // 1. Test GET /api/admin/campaign-categories
  const adminCategories = await request('GET', '/api/admin/campaign-categories', null, token);
  console.log('\n1. GET /api/admin/campaign-categories status:', adminCategories.status);
  const categoriesList = adminCategories.body.data || adminCategories.body.categories || [];
  console.log('   - Categories count:', categoriesList.length);
  if (categoriesList.length > 0) {
    console.log('   - Sample Category:', categoriesList[0].name, 'Icon:', categoriesList[0].icon);
  }

  // 2. Test GET /api/donor/campaign-categories
  const donorCategories = await request('GET', '/api/donor/campaign-categories', null, token);
  console.log('\n2. GET /api/donor/campaign-categories status:', donorCategories.status);

  // 3. Test GET /api/admin/ngos phone enrichment
  const ngosRes = await request('GET', '/api/admin/ngos', null, token);
  console.log('\n3. GET /api/admin/ngos status:', ngosRes.status);
  const ngos = ngosRes.body.data || [];
  if (ngos.length > 0) {
    console.log('   - Sample NGO Name:', ngos[0].name);
    console.log('   - Sample NGO Phone:', ngos[0].phone);
    console.log('   - Sample NGO Mobile Number:', ngos[0].mobileNumber);
    console.log('   - Sample NGO Contact Person:', ngos[0].contactPerson);
  }

  console.log('\n--- 🚀 FUNDRAISER CATEGORY & NGO PHONE TEST COMPLETE ---');
  process.exit(0);
}

run();
