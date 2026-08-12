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
  console.log('--- 🧪 TESTING DONOR & NGO PROFILE EDIT APIS ---');

  // 1. Create logged-in donor
  const donorPhone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;
  await request('POST', '/api/auth/login', { phone: donorPhone, otp: '1234' });
  const donorAuth = await request('POST', '/api/auth/verify-otp', { phone: donorPhone, otp: '1234' });
  const donorToken = donorAuth.body?.token || donorAuth.body?.data?.token;

  // Test Donor Profile Edit (Screenshot 1 & 2)
  const donorEmail = `alex_${Date.now()}@example.com`;
  const donorPayload = {
    name: "Alex Mercer",
    email: donorEmail,
    gender: "Male",
    phone: donorPhone
  };

  const editDonorRes = await request('PUT', '/api/donor/profile', donorPayload, donorToken);
  console.log('\n1. PUT /api/donor/profile -> Status:', editDonorRes.status);
  console.log('   Response message:', editDonorRes.body?.message);
  console.log('   Updated fields:', {
    name: editDonorRes.body?.data?.name,
    email: editDonorRes.body?.data?.email,
    gender: editDonorRes.body?.data?.gender,
    phone: editDonorRes.body?.data?.phone
  });

  // 2. Create logged-in NGO
  const ngoPhone = `+91986${Math.floor(1000000 + Math.random() * 9000000)}`;
  await request('POST', '/api/auth/login', { phone: ngoPhone, otp: '1234', role: 'ngo' });
  const ngoAuth = await request('POST', '/api/auth/verify-otp', { phone: ngoPhone, otp: '1234' });
  const ngoToken = ngoAuth.body?.token || ngoAuth.body?.data?.token;

  // Test NGO Profile Edit (Screenshot 3)
  const ngoEmail = `astro_${Date.now()}@example.com`;
  const ngoPayload = {
    organizationName: "Astro Foundation",
    registeredAddress: "42 Galaxy Way, Sector 5",
    years: "7 Years",
    phone: ngoPhone,
    email: ngoEmail,
    about: "Empowering underprivileged children through technology and digital literacy."
  };

  const editNgoRes = await request('PUT', '/api/ngo/profile', ngoPayload, ngoToken);
  console.log('\n2. PUT /api/ngo/profile -> Status:', editNgoRes.status);
  console.log('   Response message:', editNgoRes.body?.message);
  console.log('   Updated fields:', {
    name: editNgoRes.body?.data?.name || editNgoRes.body?.data?.organizationName,
    registeredAddress: editNgoRes.body?.data?.registeredAddress,
    years: editNgoRes.body?.data?.years,
    phone: editNgoRes.body?.data?.phone,
    email: editNgoRes.body?.data?.email,
    about: editNgoRes.body?.data?.about
  });

  process.exit(0);
}

run();
