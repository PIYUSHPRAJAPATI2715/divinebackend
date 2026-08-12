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
  const phone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;
  await request('POST', '/api/auth/login', { phone, otp: '1234' });
  const verifyRes = await request('POST', '/api/auth/verify-otp', { phone, otp: '1234' });
  const token = verifyRes.body && (verifyRes.body.token || (verifyRes.body.data && verifyRes.body.data.token));

  const res = await request('GET', '/api/donor/my-campaigns', null, token);
  console.log('GET /api/donor/my-campaigns response structure:');
  console.log('Top level keys:', Object.keys(res.body));
  console.log('totalRaised:', res.body.totalRaised);
  console.log('totalGetAmount:', res.body.totalGetAmount);
  console.log('totalGoal:', res.body.totalGoal);
  console.log('totalDonorsCount:', res.body.totalDonorsCount);
  if (res.body.myCampaigns && res.body.myCampaigns.length > 0) {
    const item = res.body.myCampaigns[0];
    console.log('Sample item keys:', {
      title: item.title,
      raised: item.raised,
      raisedAmount: item.raisedAmount,
      getAmount: item.getAmount,
      goal: item.goal,
      goalAmount: item.goalAmount
    });
  }
  process.exit(0);
}

run();
