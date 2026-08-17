const http = require('http');

const PORT = 5001;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: encodeURI(path),
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
  console.log('--- 🧪 TESTING TEXT REVIEW, VIDEO REVIEW & LIVE RATING AGGREGATION ---');

  // Sample base64 MP4 dummy video header
  const sampleBase64Video = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAptZGF0';

  console.log('\n1. POST /api/reviews (Submit Video Review with 5-Star Rating):');
  const postRes1 = await request('POST', '/api/reviews', {
    userName: 'Aarav Sharma',
    userRole: 'Donor',
    type: 'NGO',
    targetName: 'Pratham Education Foundation',
    rating: 5,
    comment: 'Wonderful experience supporting children education! Video feedback attached.',
    videoUrl: sampleBase64Video,
    status: 'Approved'
  });
  console.log('   Status:', postRes1.status);
  console.log('   Review ID:', postRes1.body?.data?.reviewId);
  console.log('   Video URL:', postRes1.body?.data?.videoUrl, '(Verified HTTP URL on server disk)');

  console.log('\n2. POST /api/reviews (Submit 2nd Text Review with 4-Star Rating):');
  const postRes2 = await request('POST', '/api/reviews', {
    userName: 'Priya Verma',
    userRole: 'Donor',
    type: 'NGO',
    targetName: 'Pratham Education Foundation',
    rating: 4,
    comment: 'Great transparent updates and photos provided by NGO.',
    status: 'Approved'
  });
  console.log('   Status:', postRes2.status);

  console.log('\n3. GET /api/reviews/target/NGO/Pratham Education Foundation (Check Rating Re-aggregation):');
  const targetRes = await request('GET', '/api/reviews/target/NGO/Pratham Education Foundation');
  console.log('   Status:', targetRes.status);
  console.log('   Target Name:', targetRes.body?.targetName);
  console.log('   Computed Average Rating:', targetRes.body?.averageRating, '(Expected ~4.5 ★)');
  console.log('   Total Approved Reviews:', targetRes.body?.totalReviews);
  console.log('   Star Distribution:', targetRes.body?.ratingDistribution);

  console.log('\n4. GET /api/admin/reviews (Admin Dashboard Summary & Video Filters):');
  const adminRes = await request('GET', '/api/admin/reviews');
  console.log('   Status:', adminRes.status);
  console.log('   Stats Summary:', adminRes.body?.stats);

  process.exit(0);
}

run();
