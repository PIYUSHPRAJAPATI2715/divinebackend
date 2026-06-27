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

// Helper to make a JSON PUT request
const putJSON = (path, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5099,
      path,
      method: 'PUT',
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
  console.log('Starting backend server for Cart and flow verification...');
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
    await postJSON('/api/auth/login', { phone: '+91 9999999999' });
    const verifyRes = await postJSON('/api/auth/verify-otp', { phone: '+91 9999999999', otp: '1234' });
    const token = verifyRes.body.token;
    console.log('Donor token obtained:', token ? 'SUCCESS' : 'FAILED');

    console.log('\n--- 2. Fetching Dan Items to Add to Cart ---');
    const categoriesRes = await getJSON('/api/dan/categories', token);
    const foodCategory = (categoriesRes.body.data || []).find(c => c.name === 'Food');
    if (!foodCategory) throw new Error('FAIL: Food category not found');

    const subRes = await getJSON(`/api/dan/subcategories?category=${foodCategory._id}`, token);
    const saintsSub = (subRes.body.data || []).find(s => s.name === 'Saints & Brahmins Seva');
    if (!saintsSub) throw new Error('FAIL: Saints & Brahmins subcategory not found');

    const itemsRes = await getJSON(`/api/dan/items?subcategory=${saintsSub._id}`, token);
    const items = itemsRes.body.data || [];
    console.log('Available items:', items.map(i => ({ name: i.name, price: i.price, _id: i._id })));

    const item1 = items[0];
    const item2 = items[1];
    if (!item1 || !item2) throw new Error('FAIL: Needed at least 2 items under Saints & Brahmins subcategory');

    console.log('\n--- 3. Cart CRUD APIs: Save Items ---');
    const saveCartRes = await postJSON('/api/dan/cart', {
      items: [
        { itemId: item1._id, quantity: 2 },
        { itemId: item2._id, quantity: 1 }
      ]
    }, { 'Authorization': `Bearer ${token}` });

    console.log('Save Cart Status:', saveCartRes.statusCode);
    if (saveCartRes.statusCode !== 200) {
      throw new Error(`FAIL: Save cart failed: ${JSON.stringify(saveCartRes.body)}`);
    }
    console.log('Saved Cart Items count:', saveCartRes.body.data?.items?.length);

    console.log('\n--- 4. Cart CRUD APIs: Get Cart ---');
    const getCartRes = await getJSON('/api/dan/cart', token);
    console.log('Get Cart Status:', getCartRes.statusCode);
    const cartData = getCartRes.body.data;
    console.log('Cart Items name and quantity details:');
    cartData.items.forEach(it => {
      console.log(`- ${it.itemId.name}: quantity ${it.quantity}, price ₹${it.itemId.price}`);
    });

    console.log('\n--- 5. Cart CRUD APIs: Update Event Details and Frequency (Monthly) ---');
    const updateEventRes = await putJSON('/api/dan/cart/event', {
      frequency: 'Monthly',
      eventType: 'Birthday',
      eventName: 'Noah\'s Birthday Monthly Seva',
      eventDate: '2026-06-30'
    }, { 'Authorization': `Bearer ${token}` });

    console.log('Update Event Status:', updateEventRes.statusCode);
    console.log('Updated Cart Frequency:', updateEventRes.body.data?.frequency);
    console.log('Updated Cart Event Name:', updateEventRes.body.data?.eventName);
    if (updateEventRes.body.data?.frequency !== 'Monthly') {
      throw new Error('FAIL: Cart frequency was not updated to Monthly!');
    }

    console.log('\n--- 6. Cart Checkout (Wallet Payment Method) ---');
    // Top up wallet to ensure enough balance (Item1: 2 * price + Item2: 1 * price)
    const totalCost = (item1.price * 2) + (item2.price * 1);
    console.log(`Total cost to checkout: ₹${totalCost}. Topping up wallet with ₹1000...`);
    await postJSON('/api/auth/wallet/topup', { amount: 1000 }, { 'Authorization': `Bearer ${token}` });

    const walletBeforeRes = await getJSON('/api/donor/wallet', token);
    const balanceBefore = walletBeforeRes.body.data?.walletBalance || 0;
    console.log('Wallet balance before checkout:', balanceBefore);

    const checkoutRes = await postJSON('/api/dan/cart/checkout', { paymentMethod: 'Wallet' }, { 'Authorization': `Bearer ${token}` });
    console.log('Checkout response status:', checkoutRes.statusCode);
    console.log('Checkout response body:', JSON.stringify(checkoutRes.body));
    if (checkoutRes.statusCode !== 200) {
      throw new Error(`FAIL: Checkout failed with status ${checkoutRes.statusCode}`);
    }

    const walletAfterRes = await getJSON('/api/donor/wallet', token);
    const balanceAfter = walletAfterRes.body.data?.walletBalance || 0;
    console.log('Wallet balance after checkout:', balanceAfter);
    if (balanceAfter !== balanceBefore - totalCost) {
      throw new Error(`FAIL: Wallet balance deduction incorrect! Expected ₹${balanceBefore - totalCost}, got ₹${balanceAfter}`);
    }
    console.log('SUCCESS: Wallet balance correctly deducted.');

    // Get Cart again to make sure it was cleared
    const getCartAfterRes = await getJSON('/api/dan/cart', token);
    console.log('Cart items count after checkout:', getCartAfterRes.body.data?.items?.length);
    if (getCartAfterRes.body.data?.items?.length !== 0) {
      throw new Error('FAIL: Cart was not cleared after checkout!');
    }
    console.log('SUCCESS: Cart cleared successfully after checkout.');

    console.log('\n--- 7. Verifying ledger Transaction and DanDonation entries ---');
    const txRes = await getJSON('/api/donor/transactions', token);
    const donationTx = (txRes.body.data || []).find(t => t.item.startsWith('Dan:'));
    if (!donationTx) {
      throw new Error('FAIL: Transaction entry not found for Cart checkout!');
    }
    console.log('Found ledger transaction:', JSON.stringify(donationTx));

    console.log('\n--- 8. Admin authentication token verification fix ---');
    // Admin login
    const adminLoginRes = await postJSON('/api/auth/login', { email: 'admin@astroadvyc.com', password: 'password123' });
    const adminToken = adminLoginRes.body.token;
    console.log('Admin token obtained:', adminToken ? 'SUCCESS' : 'FAILED');

    // Run category list or edit using admin token
    // Previously would have thrown 401 due to database lookup in User collection
    const adminCategoryAddRes = await postJSON('/api/dan/categories', {
      name: 'Special Admin Category',
      description: 'Created by Admin to verify token fixes'
    }, { 'Authorization': `Bearer ${adminToken}` });
    console.log('Admin Category Create Status:', adminCategoryAddRes.statusCode);
    if (adminCategoryAddRes.statusCode !== 201) {
      throw new Error(`FAIL: Admin token is still rejected by auth middleware! Status: ${adminCategoryAddRes.statusCode}`);
    }
    console.log('SUCCESS: Admin token authenticated correctly. Category created successfully by Admin.');

    console.log('\n--- 9. NGO Panel dan integration ---');
    // NGO Login
    const ngoLogin = await postJSON('/api/auth/login', { phone: '+91 8888833333' });
    const ngoVerify = await postJSON('/api/auth/verify-otp', { phone: '+91 8888833333', otp: '1234' });
    const ngoToken = ngoVerify.body.token;
    console.log('NGO token obtained:', ngoToken ? 'SUCCESS' : 'FAILED');

    // 1. Get NGO Dan items
    const ngoItemsGet = await getJSON('/api/ngo/dan/items', ngoToken);
    console.log('NGO items status:', ngoItemsGet.statusCode);
    console.log('NGO initial Dan items count:', ngoItemsGet.body.data?.length);

    // 2. Create NGO Dan item
    const ngoItemCreate = await postJSON('/api/ngo/dan/items', {
      subcategoryId: saintsSub._id,
      name: 'NGO Special Food Packet',
      description: 'Fresh lunch packets distributed by Gaushala staff.',
      price: 60,
      unit: '1 Packet',
      imageUrl: 'https://images.unsplash.com/photo-1570051008600-b34bac49e7f1'
    }, { 'Authorization': `Bearer ${ngoToken}` });
    console.log('NGO Dan Item Create status:', ngoItemCreate.statusCode);
    const createdNgoItem = ngoItemCreate.body.data;
    if (ngoItemCreate.statusCode !== 201) {
      throw new Error(`FAIL: NGO could not create item under /api/ngo/dan/items: ${JSON.stringify(ngoItemCreate.body)}`);
    }
    console.log('SUCCESS: NGO successfully created item:', createdNgoItem.name);

    // 3. Edit NGO Dan item
    const ngoItemEdit = await putJSON(`/api/ngo/dan/items/${createdNgoItem._id}`, {
      price: 80
    }, { 'Authorization': `Bearer ${ngoToken}` });
    console.log('NGO Dan Item Edit status:', ngoItemEdit.statusCode);
    console.log('NGO Dan Item Updated Price:', ngoItemEdit.body.data?.price);
    if (ngoItemEdit.body.data?.price !== 80) {
      throw new Error('FAIL: NGO could not edit item successfully');
    }

    // 4. Delete NGO Dan item
    const ngoItemDelete = await http.request({
      hostname: 'localhost',
      port: 5099,
      path: `/api/ngo/dan/items/${createdNgoItem._id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ngoToken}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('NGO Dan Item Delete status:', res.statusCode);
        if (res.statusCode !== 200) {
          console.error('Delete failed:', data);
        }
      });
    });
    ngoItemDelete.end();
    await wait(2000); // Wait for delete request to finish processing

    // 5. NGO list donations
    const ngoDonations = await getJSON('/api/ngo/dan/donations', ngoToken);
    console.log('NGO Dan donations count:', ngoDonations.body.data?.length);
    if (ngoDonations.statusCode !== 200) {
      throw new Error('FAIL: NGO could not retrieve Dan donations list');
    }
    console.log('SUCCESS: NGO Dan donations list retrieved successfully.');

    console.log('\nAll Dan Cart Flow and NGO Panel integration verification successful!');
  } catch (error) {
    console.error('FAIL: Test suite failed with error:', error);
  } finally {
    console.log('Shutting down local server...');
    server.kill();
  }
}

runTests();
