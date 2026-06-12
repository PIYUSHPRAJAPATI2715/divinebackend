const http = require('https');

function makeRequest(hostname, path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: hostname,
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
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
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
  const host = 'divinebackend-v5gl.onrender.com';
  console.log('1. Logging in as admin...');
  const loginRes = await makeRequest(host, '/api/auth/login', 'POST', {
    email: 'admin@astroadvyc.com',
    password: 'password123'
  });

  if (loginRes.statusCode !== 200 || !loginRes.body.token) {
    console.error('FAIL: Could not log in.', loginRes.body);
    return;
  }

  const token = loginRes.body.token;
  console.log('2. Fetching /api/admin/ngos from live server...');
  const ngosRes = await makeRequest(host, '/api/admin/ngos', 'GET', null, {
    'Authorization': `Bearer ${token}`
  });

  console.log('NGOs Status:', ngosRes.statusCode);
  console.log('NGOs Response Body:');
  console.log(JSON.stringify(ngosRes.body, null, 2));
}

run().catch(console.error);
