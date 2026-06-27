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

    console.log('\n--- 1. User Authentication (Donor) ---');
    const loginRes = await postJSON('/api/auth/login', { phone: '+91 9999999999' });
    const verifyRes = await postJSON('/api/auth/verify-otp', { phone: '+91 9999999999', otp: '1234' });
    const token = verifyRes.body.token;
    console.log('Donor token obtained:', token ? 'SUCCESS' : 'FAILED');

    console.log('\n--- 2. Fetching Dan Categories ---');
    const categoriesRes = await getJSON('/api/dan/categories', token);
    console.log('Categories status:', categoriesRes.statusCode);
    const categories = categoriesRes.body.data || [];
    console.log('Categories:', categories.map(c => c.name));
    
    const foodCategory = categories.find(c => c.name === 'Food');
    if (!foodCategory) {
      throw new Error('FAIL: Food category not found!');
    }

    console.log('\n--- 3. Fetching Dan Subcategories under Food category ---');
    const subRes = await getJSON(`/api/dan/subcategories?category=${foodCategory._id}`, token);
    console.log('Subcategories status:', subRes.statusCode);
    const subcategories = subRes.body.data || [];
    console.log('Subcategories:', subcategories.map(s => s.name));

    const saintsSub = subcategories.find(s => s.name === 'Saints & Brahmins Seva');
    if (!saintsSub) {
      throw new Error('FAIL: Saints & Brahmins Seva subcategory not found!');
    }

    console.log('\n--- 4. Fetching Dan Items under Saints & Brahmins Seva ---');
    const itemsRes = await getJSON(`/api/dan/items?subcategory=${saintsSub._id}`, token);
    console.log('Items status:', itemsRes.statusCode);
    const items = itemsRes.body.data || [];
    console.log('Items:', items.map(i => ({ name: i.name, price: i.price })));

    const rationKit = items.find(i => i.name.startsWith('Ration Kit For Needy Family - 30days'));
    if (!rationKit) {
      throw new Error('FAIL: Ration Kit item not found!');
    }

    console.log('\n--- 5. Performing Dan Donation with Wallet paymentMethod ---');
    const walletBeforeRes = await getJSON('/api/donor/wallet', token);
    let walletBalanceBefore = walletBeforeRes.body.data?.walletBalance || 0;
    console.log('Wallet balance before top-up:', walletBalanceBefore);

    console.log('Top-up wallet with 500...');
    await postJSON('/api/auth/wallet/topup', { amount: 500 }, { 'Authorization': `Bearer ${token}` });

    const walletAfterTopup = await getJSON('/api/donor/wallet', token);
    walletBalanceBefore = walletAfterTopup.body.data?.walletBalance || 0;
    console.log('Wallet balance after top-up (before donation):', walletBalanceBefore);

    const donationData = {
      donorName: 'Noah',
      donorPhone: '+91 9999999999',
      donorEmail: 'noah@example.com',
      frequency: 'One-Time',
      eventType: 'Birthday',
      eventName: 'Noah\'s Birthday Seva',
      eventDate: '2026-06-30',
      paymentMethod: 'Wallet',
      items: [
        {
          itemId: rationKit._id,
          quantity: 2
        }
      ]
    };

    const donateRes = await postJSON('/api/dan/donate', donationData, { 'Authorization': `Bearer ${token}` });
    console.log('Donate status:', donateRes.statusCode);
    console.log('Donate response data:', JSON.stringify(donateRes.body));
    if (donateRes.statusCode !== 200) {
      throw new Error(`FAIL: Donation failed with status ${donateRes.statusCode}`);
    }

    const walletAfterRes = await getJSON('/api/donor/wallet', token);
    const walletBalanceAfter = walletAfterRes.body.data?.walletBalance || 0;
    console.log('Wallet balance after donation:', walletBalanceAfter);
    if (walletBalanceAfter !== walletBalanceBefore - 600) {
      throw new Error('FAIL: Wallet balance was not deducted correctly by 600!');
    } else {
      console.log('SUCCESS: Wallet balance correctly deducted by 600.');
    }

    console.log('\n--- 6. Verifying Transaction Ledger entry was created ---');
    const txRes = await getJSON('/api/donor/transactions', token);
    const transactions = txRes.body.data || [];
    const donationTx = transactions.find(t => t.item.startsWith('Dan:'));
    if (!donationTx) {
      throw new Error('FAIL: Transaction ledger entry not found!');
    } else {
      console.log('SUCCESS: Transaction entry created in ledger:', JSON.stringify(donationTx));
    }

    console.log('\n--- 7. NGO login (Krishnayan Gaushala) to check NGO panel functionality ---');
    // Seed NGO user exists. Phone is '+91 8888833333' or email 'seva@gaushala.org'. Let's verify via login
    const ngoLogin = await postJSON('/api/auth/login', { phone: '+91 8888833333' }); // Krishnayan phone number
    const ngoVerify = await postJSON('/api/auth/verify-otp', { phone: '+91 8888833333', otp: '1234' });
    const ngoToken = ngoVerify.body.token;
    console.log('NGO token obtained:', ngoToken ? 'SUCCESS' : 'FAILED');

    console.log('\n--- 8. NGO fetching donations for their portal ---');
    const donationsRes = await getJSON('/api/dan/donations', ngoToken);
    console.log('NGO donations count:', donationsRes.body.data?.length);
    if (donationsRes.body.data?.length > 0) {
      console.log('SUCCESS: Donation shows up in NGO panel list.');
    } else {
      throw new Error('FAIL: Donation not showing up in NGO panel donations list!');
    }

    console.log('\n--- 9. NGO adding a new Dan Item ---');
    const newItemData = {
      subcategoryId: saintsSub._id,
      name: 'Special Gau Seva Ration Kit',
      description: 'Special kit containing fresh grass and fodder for sick cows.',
      price: 250,
      unit: '1 Cow Meal Kit',
      imageUrl: 'https://images.unsplash.com/photo-1570051008600-b34bac49e7f1'
    };
    const newItemRes = await postJSON('/api/dan/items', newItemData, { 'Authorization': `Bearer ${ngoToken}` });
    console.log('Create new item response status:', newItemRes.statusCode);
    console.log('New item details:', JSON.stringify(newItemRes.body.data));
    if (newItemRes.statusCode !== 201) {
      throw new Error('FAIL: NGO could not create a new Dan Item');
    } else {
      console.log('SUCCESS: NGO successfully created a new Dan Item.');
    }

    console.log('\nAll Dan Flow APIs successfully verified and working perfectly!');
  } catch (error) {
    console.error('FAIL: Test suite failed with error:', error);
  } finally {
    console.log('Shutting down local server...');
    server.kill();
  }
}

runTests();
