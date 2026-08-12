const fs = require('fs');
const path = require('path');

const postmanPath = path.join(__dirname, '..', 'postman_collection.json');
const collection = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

const coreFolder = {
  name: "⭐ CORE MOBILE APP APIS (4 Required Endpoints)",
  description: "Direct clean endpoints for Followers, Following, Fundraiser Categories, and User Created Campaigns.",
  item: [
    {
      name: "1. My Followers API",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{token}}" }],
        url: {
          raw: "https://divinebackend-v5gl.onrender.com/api/donor/followers",
          protocol: "https",
          host: ["divinebackend-v5gl", "onrender", "com"],
          path: ["api", "donor", "followers"]
        }
      }
    },
    {
      name: "2. My Following API",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{token}}" }],
        url: {
          raw: "https://divinebackend-v5gl.onrender.com/api/donor/following",
          protocol: "https",
          host: ["divinebackend-v5gl", "onrender", "com"],
          path: ["api", "donor", "following"]
        }
      }
    },
    {
      name: "3. Fundraiser Categories API",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{token}}" }],
        url: {
          raw: "https://divinebackend-v5gl.onrender.com/api/donor/campaign-categories",
          protocol: "https",
          host: ["divinebackend-v5gl", "onrender", "com"],
          path: ["api", "donor", "campaign-categories"]
        }
      }
    },
    {
      name: "4. My Campaigns API (Campaigns created by me)",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{token}}" }],
        url: {
          raw: "https://divinebackend-v5gl.onrender.com/api/donor/my-campaigns",
          protocol: "https",
          host: ["divinebackend-v5gl", "onrender", "com"],
          path: ["api", "donor", "my-campaigns"]
        }
      }
    }
  ]
};

// Insert coreFolder as the 1st folder at the very top of Postman collection!
collection.item.unshift(coreFolder);

const updatedStr = JSON.stringify(collection, null, 2);
fs.writeFileSync(postmanPath, updatedStr);
fs.writeFileSync('C:\\Users\\AB COM\\.gemini\\antigravity\\brain\\6178f60a-d5db-4dc0-b81c-9decb865f08b\\divine_api_collection.json', updatedStr);
fs.writeFileSync('C:\\Users\\AB COM\\Downloads\\divine_postman_collection.json', updatedStr);

console.log('✅ Core 4 APIs folder added to the top of Postman Collection!');
