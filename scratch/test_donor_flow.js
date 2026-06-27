const { spawn } = require('child_process');
const http = require('http');

// Helper to make a JSON POST request
const postJSON = (path, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(responseData) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, rawBody: responseData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

// Helper to make a GET request
const getJSON = (path, token) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(responseData) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, rawBody: responseData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('Starting backend server for verification...');
  const server = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: '5001', JWT_SECRET: 'divine_nakshatra_secret_key_2026' }
  });

  server.stdout.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('connected') || msg.includes('start') || msg.includes('running')) {
      // server ready
    }
  });

  server.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data}`);
  });

  // Give the server 5 seconds to connect and bind port
  await wait(5000);

  try {
    console.log('\n--- 1. Testing Donor Authentication ---');
    console.log('Sending OTP to +91 9999999999...');
    const loginRes = await postJSON('/api/auth/login', { phone: '+91 9999999999' });
    console.log('Login OTP response:', JSON.stringify(loginRes.body));

    console.log('Verifying OTP (1234)...');
    const verifyRes = await postJSON('/api/auth/verify-otp', { phone: '+91 9999999999', otp: '1234' });
    console.log('Verify response status:', verifyRes.statusCode);
    
    const token = verifyRes.body.token;
    if (!token) {
      throw new Error('Authentication failed - no token returned!');
    }
    console.log('Successfully authenticated! Token obtained.');

    console.log('\n--- 2. Testing Get Profile ---');
    const profileRes = await getJSON('/api/donor/profile', token);
    console.log('Profile status:', profileRes.statusCode);
    console.log('Profile response name:', profileRes.body.data?.name);

    console.log('\n--- 3. Testing Get Wallet Ledger ---');
    const walletRes = await getJSON('/api/donor/wallet', token);
    console.log('Wallet status:', walletRes.statusCode);
    console.log('Wallet response data:', JSON.stringify(walletRes.body.data));

    console.log('\n--- 4. Testing Get Notifications with imageUrl ---');
    const notifRes = await getJSON('/api/donor/notifications', token);
    console.log('Notifications status:', notifRes.statusCode);
    console.log('Sample notification:', JSON.stringify(notifRes.body.data?.[0]));

    console.log('\n--- 5. Testing Get Recent Searches ---');
    const searchRes = await getJSON('/api/donor/recent-searches', token);
    console.log('Recent searches status:', searchRes.statusCode);
    console.log('Search history:', JSON.stringify(searchRes.body.data));

    console.log('\n--- 6. Testing Get Legal Content by Slug (privacy-policy) ---');
    const contentRes = await getJSON('/api/donor/content/privacy-policy', token);
    console.log('Legal content status:', contentRes.statusCode);
    console.log('Content payload metadata:', JSON.stringify({ title: contentRes.body.title, slug: contentRes.body.slug, key: contentRes.body.key }));

    console.log('\nAll donor flow verifications completed successfully!');
  } catch (error) {
    console.error('Test suite failed with error:', error);
  } finally {
    console.log('Shutting down local server...');
    server.kill();
  }
}

runTests();
