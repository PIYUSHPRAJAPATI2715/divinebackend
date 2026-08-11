const https = require('https');

https.get('https://divinebackend-v5gl.onrender.com/postman_collection.json', (res) => {
  console.log('Production URL Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Response Length:', data.length);
    try {
      const json = JSON.parse(data);
      console.log('Collection Name:', json.info && json.info.name);
    } catch (e) {
      console.error('Failed to parse:', e.message);
    }
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
