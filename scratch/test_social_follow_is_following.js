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
  console.log('--- 🧪 TESTING SOCIAL, FOLLOWERS, FOLLOWING & IS_FOLLOWING LOGIC ---');

  // 1. Register User A
  const phoneA = `+91988${Math.floor(1000000 + Math.random() * 9000000)}`;
  await request('POST', '/api/auth/login', { phone: phoneA, otp: '1234' });
  const verifyA = await request('POST', '/api/auth/verify-otp', { phone: phoneA, otp: '1234' });
  const tokenA = verifyA.body && (verifyA.body.token || (verifyA.body.data && verifyA.body.data.token));
  console.log(`\n1. User A Registered (${phoneA})`);

  // 2. Initial Following List (Empty)
  const initialFollowing = await request('GET', '/api/donor/following', null, tokenA);
  console.log('\n2. GET /api/donor/following status:', initialFollowing.status);
  console.log('   - followingCount:', initialFollowing.body.followingCount);
  console.log('   - following array length:', initialFollowing.body.following ? initialFollowing.body.following.length : 0);

  // 3. Discover NGOs
  const discoverRes = await request('GET', '/api/donor/discover', null, tokenA);
  console.log('\n3. GET /api/donor/discover status:', discoverRes.status);
  const ngos = discoverRes.body.ngos || [];
  console.log('   - Discovered NGOs count:', ngos.length);

  if (ngos.length > 0) {
    const targetNgo = ngos[0];
    console.log(`\n4. Target NGO: ${targetNgo.name} (ID: ${targetNgo._id})`);
    console.log('   - Initial isFollowing in discover API:', targetNgo.isFollowing);

    // 5. Follow Target NGO via POST /api/donor/follow/:id
    const followRes = await request('POST', `/api/donor/follow/${targetNgo._id}`, null, tokenA);
    console.log('\n5. POST /api/donor/follow/:id status:', followRes.status);
    console.log('   - Response message:', followRes.body.message);
    console.log('   - Response isFollowing:', followRes.body.isFollowing);

    // 6. Verify GET /api/donor/following now contains target NGO with isFollowing: true
    const updatedFollowing = await request('GET', '/api/donor/following', null, tokenA);
    console.log('\n6. GET /api/donor/following status:', updatedFollowing.status);
    console.log('   - followingCount:', updatedFollowing.body.followingCount);
    if (updatedFollowing.body.following && updatedFollowing.body.following.length > 0) {
      const f0 = updatedFollowing.body.following[0];
      console.log('   - Followed NGO Name:', f0.name);
      console.log('   - Followed NGO isFollowing:', f0.isFollowing);
    }

    // 7. Follow Check API
    const checkRes = await request('GET', `/api/donor/follow/check/${targetNgo._id}`, null, tokenA);
    console.log('\n7. GET /api/donor/follow/check/:id status:', checkRes.status);
    console.log('   - Check API isFollowing:', checkRes.body.isFollowing);

    // 8. Unfollow Target NGO via POST /api/donor/follow/:id
    const unfollowRes = await request('POST', `/api/donor/follow/${targetNgo._id}`, null, tokenA);
    console.log('\n8. Unfollow POST status:', unfollowRes.status);
    console.log('   - Response message:', unfollowRes.body.message);
    console.log('   - Response isFollowing:', unfollowRes.body.isFollowing);

    // 9. Verify GET /api/donor/following is empty again
    const finalFollowing = await request('GET', '/api/donor/following', null, tokenA);
    console.log('\n9. Final GET /api/donor/following followingCount:', finalFollowing.body.followingCount);
  }

  console.log('\n--- 🚀 SOCIAL & IS_FOLLOWING LOGIC TEST COMPLETE ---');
  process.exit(0);
}

run();
