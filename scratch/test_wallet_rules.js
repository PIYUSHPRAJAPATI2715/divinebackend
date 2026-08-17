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
  console.log('--- 🧪 TESTING WALLET, CASHBACK (15-DAY EXPIRY + 20% LIMIT) & DIVINE COINS (2500 LOT) ---');

  // Login as test donor
  const phone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;
  await request('POST', '/api/auth/login', { phone });
  const verifyRes = await request('POST', '/api/auth/verify-otp', { phone, otp: '1234' });
  const token = verifyRes.body?.token || verifyRes.body?.data?.token;
  const user = verifyRes.body?.user || verifyRes.body?.data?.user || {};

  console.log('\n1. GET /api/donor/wallet (Initial Balances - No Welcome Bonus):');
  const wRes1 = await request('GET', '/api/donor/wallet', null, token);
  console.log('   Status:', wRes1.status);
  console.log('   Wallet Balance:', wRes1.body?.data?.walletBalance, '(Expected: 0)');
  console.log('   Cashback Balance:', wRes1.body?.data?.cashbackBalance, '(Expected: 0)');
  console.log('   Total Coins:', wRes1.body?.data?.totalCoins, '(Expected: 0)');
  console.log('   Pre-defined Recharge Tiers Count:', wRes1.body?.data?.predefinedRechargeTiers?.length);

  console.log('\n2. POST /api/donor/wallet/topup (Recharge ₹1,000 Tier):');
  const topupRes = await request('POST', '/api/donor/wallet/topup', { amount: 1000, tierId: 'TIER-1000' }, token);
  console.log('   Status:', topupRes.status);
  console.log('   Message:', topupRes.body?.message);
  console.log('   New Wallet Balance:', topupRes.body?.data?.walletBalance);
  console.log('   New Cashback Balance:', topupRes.body?.data?.cashbackBalance, '(Expires in 15 days)');
  console.log('   New Total Coins:', topupRes.body?.data?.totalCoins);

  console.log('\n3. Testing Divine Coins Redemption (< 2500 Coins Error Guard):');
  const failPayRes = await request('POST', '/api/donor/wallet/pay', { amount: 500, useCoins: true }, token);
  console.log('   Status:', failPayRes.status, '(Expected 400)');
  console.log('   Guard Message:', failPayRes.body?.message);

  console.log('\n4. Admin Adjust Coins to 2,500 Coins for Lot Redemption Test:');
  const userId = user._id || user.id || user.userId;
  const adjRes = await request('POST', '/api/admin/wallet-settings/adjust-user', { userId, phone, action: 'add', type: 'coins', amount: 1500, description: 'Test Bonus Coins' }, token);
  console.log('   Adjust Status:', adjRes.status);

  console.log('\n5. Successful Transaction with 20% Max Cashback + 2500 Coins Lot Redemption:');
  const payRes = await request('POST', '/api/donor/wallet/pay', { amount: 1000, useCashback: true, useCoins: true }, token);
  console.log('   Status:', payRes.status);
  console.log('   Message:', payRes.body?.message);
  console.log('   Cashback Deducted:', payRes.body?.data?.cashbackDeducted, '(Max 20% of 1000 = ₹200 or active balance ₹150)');
  console.log('   Coins Redeemed:', payRes.body?.data?.coinsRedeemed, '(Exact 2500 Lot)');
  console.log('   Coins Discount Amount:', payRes.body?.data?.coinsDiscountAmount, '(₹250)');
  console.log('   Net Wallet Deducted:', payRes.body?.data?.walletDeducted);
  console.log('   Remaining Wallet Balance:', payRes.body?.data?.remainingWalletBalance);
  console.log('   Remaining Coins:', payRes.body?.data?.remainingCoins);

  console.log('\n6. GET /api/admin/wallet-settings (Admin Config API):');
  const adminSetRes = await request('GET', '/api/admin/wallet-settings', null, token);
  console.log('   Status:', adminSetRes.status);
  console.log('   Coins Per Rupee:', adminSetRes.body?.data?.coinsPerRupee);
  console.log('   Coin Redeem Lot Size:', adminSetRes.body?.data?.coinRedeemLotSize);
  console.log('   Cashback Expiry Days:', adminSetRes.body?.data?.cashbackExpiryDays);
  console.log('   Cashback Max Redeem %:', adminSetRes.body?.data?.cashbackMaxRedeemPercent);

  process.exit(0);
}

run();
