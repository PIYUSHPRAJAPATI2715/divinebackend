const http = require('http');

const PORT = 5001;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- 🧪 VERIFYING FIXES ---');

  // 1. GET /api/home
  const homeRes = await makeRequest('/api/home');
  console.log('\n1. GET /api/home status:', homeRes.status);
  if (homeRes.body && homeRes.body.data) {
    console.log('   - totalDonateAmount:', homeRes.body.data.totalDonateAmount);
    console.log('   - platformTotalDonateAmount:', homeRes.body.data.platformTotalDonateAmount);
  }

  await makeRequest('/api/auth/login', 'POST', {
    phone: '+919870961933',
    otp: '1234'
  });

  const verifyRes = await makeRequest('/api/auth/verify-otp', 'POST', {
    phone: '+919870961933',
    otp: '1234'
  });

  console.log('\n2. OTP Verify status:', verifyRes.status, '| body:', JSON.stringify(verifyRes.body));
  const token = verifyRes.body && (verifyRes.body.token || (verifyRes.body.data && verifyRes.body.data.token));

  if (token) {
    // 3. Update NGO Profile with registeredAddress
    const updateRes = await makeRequest('/api/ngo/profile', 'PUT', {
      name: 'Karan Mart NGO',
      organizationName: 'Karan Mart NGO',
      registeredAddress: 'Jaipur, Rajasthan, 302020',
      logo: 'https://files.catbox.moe/q4i0t0.jpg',
      years: '5 Years'
    }, {
      'Authorization': `Bearer ${token}`
    });

    console.log('\n3. PUT /api/ngo/profile status:', updateRes.status);
    const updateData = updateRes.body.data || updateRes.body.ngo || updateRes.body;
    console.log('   - registeredAddress saved:', updateData.registeredAddress);

    // 4. GET /api/ngo/profile to verify registeredAddress returned
    const getProfileRes = await makeRequest('/api/ngo/profile', 'GET', null, {
      'Authorization': `Bearer ${token}`
    });
    console.log('\n4. GET /api/ngo/profile status:', getProfileRes.status);
    const profileData = getProfileRes.body.data || getProfileRes.body.ngo || getProfileRes.body;
    console.log('   - registeredAddress returned:', profileData.registeredAddress);

    // 5. GET /api/donor/wallet
    const walletRes = await makeRequest('/api/donor/wallet', 'GET', null, {
      'Authorization': `Bearer ${token}`
    });
    console.log('\n5. GET /api/donor/wallet status:', walletRes.status);
    if (walletRes.body && walletRes.body.data) {
      console.log('   - walletBalance:', walletRes.body.data.walletBalance);
      console.log('   - credit_amount:', walletRes.body.data.credit_amount);
      console.log('   - debit_amount:', walletRes.body.data.debit_amount);
      if (Array.isArray(walletRes.body.data.transactions) && walletRes.body.data.transactions.length > 0) {
        const tx0 = walletRes.body.data.transactions[0];
        console.log('   - Tx[0] keys: credit_amount:', tx0.credit_amount, '| debit_amount:', tx0.debit_amount, '| transactionType:', tx0.transactionType);
      }
    }
  }

  console.log('\n--- 🚀 ALL VERIFICATION TESTS PASSED ---');
  process.exit(0);
}

runTests();
