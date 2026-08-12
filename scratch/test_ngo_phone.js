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
  console.log('--- 🧪 TESTING ADMIN NGOs API PHONE NUMBER POPULATION ---');
  const phone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;
  await request('POST', '/api/auth/login', { phone, otp: '1234' });
  const verifyRes = await request('POST', '/api/auth/verify-otp', { phone, otp: '1234' });
  const token = verifyRes.body?.token || verifyRes.body?.data?.token;

  const res = await request('GET', '/api/admin/ngos', null, token);
  console.log('Status:', res.status);
  const list = res.body?.data || res.body?.ngos || (Array.isArray(res.body) ? res.body : []);
  console.log(`Found ${list.length} NGOs:`);

  list.forEach((ngo, idx) => {
    console.log(`\nNGO #${idx + 1}:`);
    console.log('  ngoId:', ngo.ngoId);
    console.log('  name:', ngo.name);
    console.log('  phone:', ngo.phone);
    console.log('  mobileNumber:', ngo.mobileNumber);
    console.log('  contactPerson:', ngo.contactPerson);
    console.log('  email:', ngo.email);
  });

  process.exit(0);
}

run();
