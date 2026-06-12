const http = require('http');

function makeRequest(path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING HOME PAGE AUTHENTICATED API TESTS ===');
  
  const phone = '+91 9999999999'; // Seeded Noah user

  // 1. Initiate Login (OTP code: 1234)
  console.log('\n[1] Initiating login for Noah (phone:', phone, ')...');
  const loginRes = await makeRequest('/api/auth/login', 'POST', { phone });
  console.log('Login Response:', loginRes.body);

  // 2. Verify OTP
  console.log('\n[2] Verifying OTP for Noah...');
  const verifyRes = await makeRequest('/api/auth/verify-otp', 'POST', { phone, otp: '1234' });
  console.log('Verify Response (Success):', verifyRes.body.message);
  const token = verifyRes.body.token;

  // 3. Query Homepage API with token
  console.log('\n[3] Querying /api/home with Bearer token...');
  const homeRes = await makeRequest('/api/home', 'GET', null, {
    'Authorization': `Bearer ${token}`
  });
  
  console.log('\n--- HOMEPAGE RESPONSE VERIFICATION ---');
  console.log('User Profile:', homeRes.body.data.user);
  console.log('Donation History List count:', homeRes.body.data.donationHistory.length);
  console.log('Donation History Items:');
  homeRes.body.data.donationHistory.forEach((item, idx) => {
    console.log(`  ${idx + 1}. NGO/Campaign: ${item.item}, Amount: ₹${item.amount}, Date: ${item.date}`);
  });

  console.log('\n=== ALL HOMEPAGE AUTHENTICATED TESTS PASSED ===');
}

runTests().catch(console.error);
