const { spawn } = require('child_process');
const http = require('http');

// Helper to make a JSON POST request
const postJSON = (path, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5099,
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
      port: 5099,
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
    env: { ...process.env, PORT: '5099', JWT_SECRET: 'divine_nakshatra_secret_key_2026' }
  });

  server.stdout.on('data', (data) => {
    console.log(`[Server stdout] ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[Server stderr] ${data}`);
  });

  // Give the server 5 seconds to connect and bind port
  await wait(5000);

  try {
    console.log('\n--- Seeding Database ---');
    const seedRes = await postJSON('/api/system/seed', {});
    console.log('Seed response:', JSON.stringify(seedRes.body));

    console.log('\n--- 1. Testing User Authentication ---');
    const loginRes = await postJSON('/api/auth/login', { phone: '+91 9999999999' });
    console.log('Login OTP response:', JSON.stringify(loginRes.body));

    const verifyRes = await postJSON('/api/auth/verify-otp', { phone: '+91 9999999999', otp: '1234' });
    console.log('Verify response status:', verifyRes.statusCode);
    const token = verifyRes.body.token;
    if (!token) {
      throw new Error('Authentication failed - no token returned!');
    }

    console.log('\n--- 2. Testing campaign list in home page API has _id ---');
    const homeRes = await getJSON('/api/home', token);
    const campaigns = homeRes.body.data?.campaigns || [];
    console.log(`Found ${campaigns.length} campaigns in homepage list.`);
    if (campaigns.length > 0) {
      console.log('Sample campaign properties:', Object.keys(campaigns[0]));
      console.log('Sample campaign _id:', campaigns[0]._id);
      if (!campaigns[0]._id) {
        throw new Error('FAIL: _id missing from campaign list item!');
      } else {
        console.log('SUCCESS: _id is present in campaign list item.');
      }
    } else {
      throw new Error('FAIL: No campaigns found in home page!');
    }

    console.log('\n--- 3. Testing Coupon claimed status ---');
    const couponsRes = await getJSON('/api/donor/coupons', token);
    const coupons = couponsRes.body.data || [];
    console.log('Coupons list:', coupons.map(c => ({ code: c.code, isActive: c.isActive })));
    const targetCoupon = coupons[0];
    if (!targetCoupon) {
      throw new Error('FAIL: No coupons found!');
    }

    console.log(`Claiming coupon: ${targetCoupon.code}...`);
    const claimRes = await postJSON('/api/donor/coupons/claim', { code: targetCoupon.code }, { 'Authorization': `Bearer ${token}` });
    console.log('Claim coupon response:', JSON.stringify(claimRes.body));

    const couponsAfterClaimRes = await getJSON('/api/donor/coupons', token);
    const couponsAfter = couponsAfterClaimRes.body.data || [];
    console.log('Coupons list after claim:', couponsAfter.map(c => ({ code: c.code, isActive: c.isActive })));
    const targetCouponAfter = couponsAfter.find(c => c.code === targetCoupon.code);
    if (targetCouponAfter.isActive !== false) {
      throw new Error('FAIL: Coupon isActive is not false after claim!');
    } else {
      console.log('SUCCESS: Coupon isActive set to false after claim.');
    }

    console.log('\n--- 4. Testing Search campaign and save searchHistory ---');
    const searchCampaignTerm = 'Gau';
    const searchCampaignRes = await getJSON(`/api/donor/campaigns?search=${searchCampaignTerm}`, token);
    console.log(`Search campaigns for "${searchCampaignTerm}" status:`, searchCampaignRes.statusCode);
    console.log(`Found ${searchCampaignRes.body.data?.length || 0} campaigns.`);

    const searchNgoTerm = 'Children';
    const searchNgoRes = await getJSON(`/api/donor/ngos?search=${searchNgoTerm}`, token);
    console.log(`Search NGOs for "${searchNgoTerm}" status:`, searchNgoRes.statusCode);
    console.log(`Found ${searchNgoRes.body.data?.length || 0} NGOs.`);

    console.log('Checking recent search history...');
    const recentRes = await getJSON('/api/donor/recent-searches', token);
    console.log('Recent searches:', recentRes.body.data);
    if (recentRes.body.data && recentRes.body.data.includes(searchCampaignTerm) && recentRes.body.data.includes(searchNgoTerm)) {
      console.log('SUCCESS: Search terms are saved in recent search history.');
    } else {
      throw new Error('FAIL: Search terms missing from recent search history!');
    }

    console.log('\n--- 5. Testing Top-up wallet api ---');
    const walletBeforeRes = await getJSON('/api/donor/wallet', token);
    const balanceBefore = walletBeforeRes.body.data?.walletBalance || 0;
    console.log('Balance before top-up:', balanceBefore);

    console.log('Top-up wallet with 250...');
    const topupRes = await postJSON('/api/auth/wallet/topup', { amount: 250 }, { 'Authorization': `Bearer ${token}` });
    console.log('Top-up response:', JSON.stringify(topupRes.body));
    if (topupRes.statusCode !== 200) {
      throw new Error(`FAIL: Top-up failed with status ${topupRes.statusCode}: ${JSON.stringify(topupRes.body)}`);
    }

    const walletAfterRes = await getJSON('/api/donor/wallet', token);
    const balanceAfter = walletAfterRes.body.data?.walletBalance || 0;
    console.log('Balance after top-up:', balanceAfter);
    if (balanceAfter !== balanceBefore + 250) {
      throw new Error(`FAIL: Balance did not increase by 250!`);
    } else {
      console.log('SUCCESS: Wallet top-up executed and balance updated.');
    }

    console.log('\n--- 6. Testing Donate wallet api ---');
    const campaignToDonate = campaigns[0];
    console.log(`Donating 50 to campaign: ${campaignToDonate.title} (ID: ${campaignToDonate._id})...`);
    const donateRes = await postJSON('/api/auth/wallet/donate', { campaignId: campaignToDonate._id, amount: 50 }, { 'Authorization': `Bearer ${token}` });
    console.log('Donate response:', JSON.stringify(donateRes.body));
    if (donateRes.statusCode !== 200) {
      throw new Error(`FAIL: Donation failed with status ${donateRes.statusCode}: ${JSON.stringify(donateRes.body)}`);
    }

    const walletFinalRes = await getJSON('/api/donor/wallet', token);
    const balanceFinal = walletFinalRes.body.data?.walletBalance || 0;
    console.log('Final balance after donation:', balanceFinal);
    if (balanceFinal !== balanceAfter - 50) {
      throw new Error(`FAIL: Balance did not decrease by 50!`);
    } else {
      console.log('SUCCESS: Wallet donation executed and balance updated.');
    }

    console.log('\nAll fixes successfully verified and working perfectly!');
  } catch (error) {
    console.error('FAIL: Test suite failed with error:', error);
  } finally {
    console.log('Shutting down local server...');
    server.kill();
  }
}

runTests();
