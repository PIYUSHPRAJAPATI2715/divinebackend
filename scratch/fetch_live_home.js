const http = require('https');

function makeRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'divinebackend-v5gl.onrender.com',
      path: '/api/home',
      method: 'GET'
    };

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
    req.end();
  });
}

async function run() {
  console.log('Fetching live homepage API /api/home...');
  const res = await makeRequest();
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  console.log('Response Body:', JSON.stringify(res.body, null, 2));
}

run().catch(console.error);
