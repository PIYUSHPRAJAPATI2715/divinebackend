const http = require('http');

const PORT = 5001;

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method: 'GET'
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
    req.end();
  });
}

async function run() {
  console.log('--- 🧪 TESTING DAAN SUBCATEGORIES & ITEMS FILTERING ---');

  // 1. Food Subcategories
  const foodSub = await makeRequest('/api/dan/subcategories?categoryId=CAT-FOOD');
  console.log('\n1. GET /api/dan/subcategories?categoryId=CAT-FOOD status:', foodSub.status);
  if (foodSub.body && foodSub.body.data) {
    console.log('   - Food Subcategories count:', foodSub.body.data.length);
    foodSub.body.data.forEach(s => console.log(`     * [${s.subcategoryId}] ${s.name}`));
  }

  // 2. Book Subcategories
  const bookSub = await makeRequest('/api/dan/subcategories?categoryId=CAT-BOOKS');
  console.log('\n2. GET /api/dan/subcategories?categoryId=CAT-BOOKS status:', bookSub.status);
  if (bookSub.body && bookSub.body.data) {
    console.log('   - Book Subcategories count:', bookSub.body.data.length);
    bookSub.body.data.forEach(s => console.log(`     * [${s.subcategoryId}] ${s.name}`));
  }

  // 3. Food Items
  const foodItems = await makeRequest('/api/dan/items?categoryId=CAT-FOOD');
  console.log('\n3. GET /api/dan/items?categoryId=CAT-FOOD status:', foodItems.status);
  if (foodItems.body && foodItems.body.data) {
    console.log('   - Food Items count:', foodItems.body.data.length);
    foodItems.body.data.forEach(i => console.log(`     * [${i.itemId}] ${i.name} (Price: ${i.price})`));
  }

  // 4. Book Items
  const bookItems = await makeRequest('/api/dan/items?categoryId=CAT-BOOKS');
  console.log('\n4. GET /api/dan/items?categoryId=CAT-BOOKS status:', bookItems.status);
  if (bookItems.body && bookItems.body.data) {
    console.log('   - Book Items count:', bookItems.body.data.length);
    bookItems.body.data.forEach(i => console.log(`     * [${i.itemId}] ${i.name} (Price: ${i.price})`));
  }

  console.log('\n--- 🚀 DAAN FILTERING TEST COMPLETE ---');
  process.exit(0);
}

run();
