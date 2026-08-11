const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'postman_collection.json');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\{\{baseUrl\}\}/g, 'https://divinebackend-v5gl.onrender.com');

fs.writeFileSync(filePath, content);
fs.writeFileSync('C:\\Users\\AB COM\\.gemini\\antigravity\\brain\\6178f60a-d5db-4dc0-b81c-9decb865f08b\\divine_api_collection.json', content);

console.log('Successfully replaced {{baseUrl}} with full https://divinebackend-v5gl.onrender.com URLs!');
