const http = require('http');

const PORT = 5001;

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: PORT,
      path
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
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- 🧪 TESTING PUBLIC GET ACCESS ---');

  const r1 = await get('/api/followers');
  console.log('1. GET /api/followers (No Token) -> Status:', r1.status, '| JSON:', JSON.stringify(r1.body));

  const r2 = await get('/api/following');
  console.log('2. GET /api/following (No Token) -> Status:', r2.status, '| JSON:', JSON.stringify(r2.body));

  const r3 = await get('/api/campaign-categories');
  console.log('3. GET /api/campaign-categories (No Token) -> Status:', r3.status, '| Categories:', (r3.body.categories || r3.body.data || []).length);

  const r4 = await get('/api/my-campaigns');
  console.log('4. GET /api/my-campaigns (No Token) -> Status:', r4.status, '| JSON:', JSON.stringify(r4.body));

  process.exit(0);
}

run();
