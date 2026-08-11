const http = require('http');

http.get('http://localhost:5001/postman_collection.json', (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Collection Name:', json.info && json.info.name);
      console.log('Items Count:', json.item && json.item.length);
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
    }
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
