const http = require('https');

const host = 'divinebackend-v5gl.onrender.com';

function makeRequest(path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: host,
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

async function run() {
  const phone = '+91 9812345678';
  
  console.log('1. Requesting OTP for teacher login...');
  const loginRes = await makeRequest('/api/auth/login', 'POST', { phone, role: 'teacher' });
  console.log('OTP Request Status:', loginRes.statusCode);
  console.log('OTP Request Response:', loginRes.body);

  if (loginRes.statusCode !== 200) {
    console.error('FAIL at login step');
    return;
  }

  console.log('\n2. Verifying OTP...');
  const verifyRes = await makeRequest('/api/auth/verify-otp', 'POST', { phone, otp: '1234' });
  console.log('Verify Status:', verifyRes.statusCode);
  console.log('Verify Response:', verifyRes.body);

  if (verifyRes.statusCode !== 200 || !verifyRes.body.token) {
    console.error('FAIL at verify step');
    return;
  }

  const token = verifyRes.body.token;

  console.log('\n3. Fetching teacher profile with token...');
  const profileRes = await makeRequest('/api/teacher/profile', 'GET', null, {
    'Authorization': `Bearer ${token}`
  });
  console.log('Profile Status:', profileRes.statusCode);
  console.log('Profile Response:', profileRes.body);
}

run().catch(console.error);
