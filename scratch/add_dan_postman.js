const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'postman_collection.json');

const danFlowFolder = {
  "name": "Dan Flow APIs",
  "description": "Dan Categories, Subcategories, Items, Checkout Donation, and Admin/NGO Panel listings.",
  "item": [
    {
      "name": "List Dan Categories",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/categories",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "categories"]
        }
      }
    },
    {
      "name": "List Dan Subcategories",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/subcategories?category=REPLACE_WITH_CATEGORY_ID",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "subcategories"],
          "query": [
            {
              "key": "category",
              "value": "REPLACE_WITH_CATEGORY_ID"
            }
          ]
        }
      }
    },
    {
      "name": "List Dan Items",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/items?subcategory=REPLACE_WITH_SUBCATEGORY_ID",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "items"],
          "query": [
            {
              "key": "subcategory",
              "value": "REPLACE_WITH_SUBCATEGORY_ID"
            }
          ]
        }
      }
    },
    {
      "name": "Submit Checkout Donation",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"donorName\": \"Noah\",\n  \"donorPhone\": \"+91 9999999999\",\n  \"donorEmail\": \"noah@example.com\",\n  \"frequency\": \"One-Time\",\n  \"eventType\": \"Birthday\",\n  \"eventName\": \"Noah's Birthday Seva\",\n  \"eventDate\": \"2026-06-30\",\n  \"paymentMethod\": \"Wallet\",\n  \"items\": [\n    {\n      \"itemId\": \"REPLACE_WITH_ITEM_OBJECT_ID\",\n      \"quantity\": 2\n    }\n  ]\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/donate",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "donate"]
        }
      }
    },
    {
      "name": "List Donations (Admin/NGO)",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/donations",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "donations"]
        }
      }
    },
    {
      "name": "Create Category (Admin/NGO)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Festival Special\",\n  \"description\": \"Special donations for major Indian festivals.\",\n  \"imageUrl\": \"https://images.unsplash.com/photo-1600100397990-a4a8ec90966a\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/categories",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "categories"]
        }
      }
    },
    {
      "name": "Create Subcategory (Admin/NGO)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"categoryId\": \"REPLACE_WITH_CATEGORY_OBJECT_ID\",\n  \"name\": \"Diwali Seva\",\n  \"description\": \"Distribute sweets and diyas to needy families.\",\n  \"imageUrl\": \"https://images.unsplash.com/photo-1600100397990-a4a8ec90966a\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/subcategories",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "subcategories"]
        }
      }
    },
    {
      "name": "Create Item (Admin/NGO)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"subcategoryId\": \"REPLACE_WITH_SUBCATEGORY_OBJECT_ID\",\n  \"name\": \"Sweet & Diya Box\",\n  \"description\": \"A box of fresh sweets, 10 clay diyas, and oil.\",\n  \"price\": 150,\n  \"unit\": \"1 Box\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/items",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "items"]
        }
      }
    }
  ]
};

try {
  const fileData = fs.readFileSync(collectionPath, 'utf8');
  const collection = JSON.parse(fileData);

  // Check if "Dan Flow APIs" already exists and remove it to prevent duplicates
  collection.item = collection.item.filter(f => f.name !== "Dan Flow APIs");

  // Add the Dan Flow folder
  collection.item.push(danFlowFolder);

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
  console.log('Successfully injected Dan Flow APIs folder into postman_collection.json!');
} catch (err) {
  console.error('Error modifying Postman collection: ', err.message);
  process.exit(1);
}
