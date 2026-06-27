const https = require('https');

// Helper to make an HTTPS POST request
const postJSON = (url, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
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

// Helper to make an HTTPS GET request
const getJSON = (url, token) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
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

async function verifyLive() {
  console.log('Initiating login on live server to set OTP...');
  try {
    const loginRes = await postJSON('https://divinebackend-v5gl.onrender.com/api/auth/login', {
      phone: '+91 9999999999'
    });
    console.log('Login initiate status:', loginRes.statusCode);

    console.log('Authenticating on live server...');
    const verifyRes = await postJSON('https://divinebackend-v5gl.onrender.com/api/auth/verify-otp', {
      phone: '+91 9999999999',
      otp: '1234'
    });
    
    const token = verifyRes.body.token;
    if (!token) {
      console.error('Authentication failed: No token returned. Verify OTP body:', verifyRes.body);
      return;
    }
    
    console.log('Successfully logged in. Testing GET /api/donor/content/terms-conditions...');
    const contentRes = await getJSON('https://divinebackend-v5gl.onrender.com/api/donor/content/terms-conditions', token);
    
    console.log('Status code:', contentRes.statusCode);
    console.log('Response body:', JSON.stringify(contentRes.body, null, 2));
    
  } catch (err) {
    console.error('Network request failed:', err.message);
  }
}

verifyLive();
