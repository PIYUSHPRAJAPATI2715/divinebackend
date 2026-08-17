const http = require('http');

const PORT = 5001;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: encodeURI(path),
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
  console.log('--- 🧪 TESTING DONOR REVIEWS API WITH VIDEO & VIDEO_URL KEYS ---');

  // Login as test donor
  const phone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;
  await request('POST', '/api/auth/login', { phone });
  const verifyRes = await request('POST', '/api/auth/verify-otp', { phone, otp: '1234' });
  const token = verifyRes.body?.token || verifyRes.body?.data?.token;

  // Sample base64 MP4 dummy video header
  const sampleBase64Video = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAptZGF0';

  console.log('\n1. POST /api/donor/reviews (Submit Video Review using video & videoUrl keys):');
  const postRes1 = await request('POST', '/api/donor/reviews', {
    type: 'Campaign',
    targetName: 'Rural Education Initiative',
    rating: 5,
    comment: 'Inspiring campaign! Video testimonial attached.',
    video: sampleBase64Video
  }, token);

  console.log('   Status:', postRes1.status);
  console.log('   Review ID:', postRes1.body?.data?.reviewId);
  console.log('   Returned videoUrl key:', postRes1.body?.data?.videoUrl);
  console.log('   Returned video key:', postRes1.body?.data?.video);

  console.log('\n2. GET /api/donor/reviews (Get Donor Reviews with video & videoUrl keys):');
  const getRes = await request('GET', '/api/donor/reviews', null, token);
  console.log('   Status:', getRes.status);
  console.log('   Review Count:', getRes.body?.count);
  console.log('   First Review video key:', getRes.body?.data?.[0]?.video);
  console.log('   First Review videoUrl key:', getRes.body?.data?.[0]?.videoUrl);

  process.exit(0);
}

run();
