const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'postman_collection.json');

const cartItems = [
  {
    "name": "Get Saved Cart",
    "request": {
      "method": "GET",
      "header": [
        { "key": "Authorization", "value": "Bearer {{token}}" }
      ],
      "url": {
        "raw": "https://divinebackend-v5gl.onrender.com/api/dan/cart",
        "protocol": "https",
        "host": ["divinebackend-v5gl", "onrender", "com"],
        "path": ["api", "dan", "cart"]
      }
    }
  },
  {
    "name": "Save/Update Cart Items",
    "request": {
      "method": "POST",
      "header": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "Authorization", "value": "Bearer {{token}}" }
      ],
      "body": {
        "mode": "raw",
        "raw": "{\n  \"items\": [\n    {\n      \"itemId\": \"REPLACE_WITH_ITEM_OBJECT_ID\",\n      \"quantity\": 3\n    }\n  ]\n}"
      },
      "url": {
        "raw": "https://divinebackend-v5gl.onrender.com/api/dan/cart",
        "protocol": "https",
        "host": ["divinebackend-v5gl", "onrender", "com"],
        "path": ["api", "dan", "cart"]
      }
    }
  },
  {
    "name": "Update Cart Event Details",
    "request": {
      "method": "PUT",
      "header": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "Authorization", "value": "Bearer {{token}}" }
      ],
      "body": {
        "mode": "raw",
        "raw": "{\n  \"frequency\": \"Monthly\",\n  \"eventType\": \"Birthday\",\n  \"eventName\": \"My Monthly Seva\",\n  \"eventDate\": \"2026-07-01\"\n}"
      },
      "url": {
        "raw": "https://divinebackend-v5gl.onrender.com/api/dan/cart/event",
        "protocol": "https",
        "host": ["divinebackend-v5gl", "onrender", "com"],
        "path": ["api", "dan", "cart", "event"]
      }
    }
  },
  {
    "name": "Clear Cart",
    "request": {
      "method": "DELETE",
      "header": [
        { "key": "Authorization", "value": "Bearer {{token}}" }
      ],
      "url": {
        "raw": "https://divinebackend-v5gl.onrender.com/api/dan/cart",
        "protocol": "https",
        "host": ["divinebackend-v5gl", "onrender", "com"],
        "path": ["api", "dan", "cart"]
      }
    }
  },
  {
    "name": "Checkout / Donate Saved Cart",
    "request": {
      "method": "POST",
      "header": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "Authorization", "value": "Bearer {{token}}" }
      ],
      "body": {
        "mode": "raw",
        "raw": "{\n  \"paymentMethod\": \"Wallet\"\n}"
      },
      "url": {
        "raw": "https://divinebackend-v5gl.onrender.com/api/dan/cart/checkout",
        "protocol": "https",
        "host": ["divinebackend-v5gl", "onrender", "com"],
        "path": ["api", "dan", "cart", "checkout"]
      }
    }
  }
];

try {
  const fileData = fs.readFileSync(collectionPath, 'utf8');
  const collection = JSON.parse(fileData);

  const danFolder = collection.item.find(f => f.name === "Dan Flow APIs");
  if (!danFolder) {
    throw new Error('Dan Flow APIs folder not found in postman_collection.json');
  }

  // Remove existing cart endpoints if any to avoid duplication
  danFolder.item = danFolder.item.filter(item => !cartItems.some(c => c.name === item.name));

  // Add the new cart items
  danFolder.item.push(...cartItems);

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
  console.log('Successfully injected Dan Cart flow APIs into postman_collection.json!');
} catch (err) {
  console.error('Error updating Postman: ', err.message);
  process.exit(1);
}
