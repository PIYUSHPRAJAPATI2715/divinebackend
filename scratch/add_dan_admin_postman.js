const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'postman_collection.json');

const adminDanFolder = {
  "name": "Dan Panel (Admin)",
  "description": "Administrative menus to add Dan Types (Categories), Subcategories, and Items.",
  "item": [
    {
      "name": "1. Create Category (Add Dan Type)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Food\",\n  \"description\": \"Food for the needy, saints, and children.\",\n  \"imageUrl\": \"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c\"\n}"
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
      "name": "2. Create Subcategory",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"categoryId\": \"REPLACE_WITH_CATEGORY_OBJECT_ID\",\n  \"name\": \"Saints & Brahmins Seva\",\n  \"description\": \"Provide freshly cooked hot meals and ration kits.\",\n  \"imageUrl\": \"https://images.unsplash.com/photo-1570051008600-b34bac49e7f1\"\n}"
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
      "name": "3. Create Item",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"subcategoryId\": \"REPLACE_WITH_SUBCATEGORY_OBJECT_ID\",\n  \"name\": \"Ration Kit For Needy Family - 30days\",\n  \"description\": \"Ration kit containing flour, rice, pulses, oil, spices, and tea.\",\n  \"price\": 300,\n  \"unit\": \"1 Kit\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/dan/items",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "dan", "items"]
        }
      }
    },
    {
      "name": "List All Donations (Admin)",
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
    }
  ]
};

const ngoDashboardFolder = {
  "name": "NGO Dashboard APIs",
  "description": "NGO Panel operations including campaigns management, payout history, bank accounts update, and NGO-specific Dan items/donations flow.",
  "item": [
    {
      "name": "NGO Profile",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/ngo/profile",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "ngo", "profile"]
        }
      }
    },
    {
      "name": "Update NGO Profile",
      "request": {
        "method": "PUT",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Krishnayan Gaushala Seva\",\n  \"about\": \"Dedicated to feeding and maintaining sick, abandoned, and old cows.\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/ngo/profile",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "ngo", "profile"]
        }
      }
    },
    {
      "name": "List NGO Dan Items",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/ngo/dan/items",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "ngo", "dan", "items"]
        }
      }
    },
    {
      "name": "Create NGO Dan Item",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"subcategoryId\": \"REPLACE_WITH_SUBCATEGORY_OBJECT_ID\",\n  \"name\": \"Dry Grass Bundle for 10 Cows\",\n  \"description\": \"A bundle of dry grass fodder for cows.\",\n  \"price\": 100,\n  \"unit\": \"1 Bundle\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/ngo/dan/items",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "ngo", "dan", "items"]
        }
      }
    },
    {
      "name": "List Received Dan Donations",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/ngo/dan/donations",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "ngo", "dan", "donations"]
        }
      }
    }
  ]
};

try {
  const fileData = fs.readFileSync(collectionPath, 'utf8');
  const collection = JSON.parse(fileData);

  // 1. Find Admin Dashboard APIs folder
  const adminDashboardFolder = collection.item.find(f => f.name === "Admin Dashboard APIs");
  if (adminDashboardFolder) {
    // Remove existing folder if any to avoid duplication
    adminDashboardFolder.item = adminDashboardFolder.item.filter(f => f.name !== "Dan Panel (Admin)");
    // Insert Admin Dan folder
    adminDashboardFolder.item.push(adminDanFolder);
    console.log('Successfully injected Dan Panel (Admin) into Admin Dashboard APIs!');
  } else {
    console.warn('Admin Dashboard APIs folder not found!');
  }

  // 2. Add NGO Dashboard APIs folder at the top level
  collection.item = collection.item.filter(f => f.name !== "NGO Dashboard APIs");
  collection.item.push(ngoDashboardFolder);
  console.log('Successfully added NGO Dashboard APIs at the collection root!');

  // 3. Rename "Dan Flow APIs" folder to "Dan Flow (Donor Client)" and keep only donor APIs
  const danFlowFolder = collection.item.find(f => f.name === "Dan Flow APIs");
  if (danFlowFolder) {
    danFlowFolder.name = "Dan Flow (Donor Client)";
    danFlowFolder.description = "Donor facing client-side APIs for browsing categories, subcategories, items, managing cart, and submitting checkouts.";
    // Filter out Admin/NGO specific creations from donor folder
    danFlowFolder.item = danFlowFolder.item.filter(item => 
      !item.name.includes("Create Category") && 
      !item.name.includes("Create Subcategory") && 
      !item.name.includes("Create Item") && 
      !item.name.includes("List Donations")
    );
  }

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
  console.log('Successfully restructured postman_collection.json!');
} catch (err) {
  console.error('Error restructuring Postman: ', err.message);
  process.exit(1);
}
