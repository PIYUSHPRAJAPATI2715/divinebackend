const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'postman_collection.json');

try {
  const fileData = fs.readFileSync(collectionPath, 'utf8');
  const collection = JSON.parse(fileData);

  // Find and update the "Admin Help Desk & Rewards" folder to point to the new admin donor modular path
  const adminHelpFolderIdx = collection.item.findIndex(i => i.name === 'Admin Help Desk & Rewards');
  if (adminHelpFolderIdx !== -1) {
    collection.item[adminHelpFolderIdx] = {
      "name": "Admin Help Desk & Rewards",
      "description": "Admin controls to resolve user tickets, push notifications, adjust wallets, and configure policies dynamically.",
      "item": [
        {
          "name": "Get Support Tickets",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "url": {
              "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor/tickets",
              "protocol": "https",
              "host": ["divinebackend-v5gl", "onrender", "com"],
              "path": ["api", "admin", "donor", "tickets"]
            }
          }
        },
        {
          "name": "Reply & Resolve Ticket",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"reply\": \"Your 80G tax receipt has been processed. You can download it under Wallet logs.\"\n}"
            },
            "url": {
              "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor/tickets/:id/reply",
              "protocol": "https",
              "host": ["divinebackend-v5gl", "onrender", "com"],
              "path": ["api", "admin", "donor", "tickets", ":id", "reply"],
              "variable": [{ "key": "id", "value": "REPLACE_WITH_TICKET_OBJECT_ID" }]
            }
          }
        },
        {
          "name": "Create Reward Coupon",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"code\": \"SUMMER150\",\n  \"description\": \"Flat \u20b9150 wallet cashback on any first course registration.\",\n  \"discountType\": \"Flat\",\n  \"value\": 150,\n  \"expiryDate\": \"2026-12-31\"\n}"
            },
            "url": {
              "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor/coupons",
              "protocol": "https",
              "host": ["divinebackend-v5gl", "onrender", "com"],
              "path": ["api", "admin", "donor", "coupons"]
            }
          }
        },
        {
          "name": "Delete Reward Coupon",
          "request": {
            "method": "DELETE",
            "header": [
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "url": {
              "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor/coupons/:id",
              "protocol": "https",
              "host": ["divinebackend-v5gl", "onrender", "com"],
              "path": ["api", "admin", "donor", "coupons", ":id"],
              "variable": [{ "key": "id", "value": "REPLACE_WITH_COUPON_OBJECT_ID" }]
            }
          }
        },
        {
          "name": "Push/Broadcast Notification",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"title\": \"Urgent Relief Support Needed\",\n  \"message\": \"Gau Seva Trust needs dry grass fodder sponsorships immediately! Check active campaigns.\"\n}"
            },
            "url": {
              "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor/notifications",
              "protocol": "https",
              "host": ["divinebackend-v5gl", "onrender", "com"],
              "path": ["api", "admin", "donor", "notifications"]
            }
          }
        },
        {
          "name": "Adjust Wallet Balance",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"userId\": \"REPLACE_WITH_USER_ID\",\n  \"amount\": 500,\n  \"action\": \"credit\"\n}"
            },
            "url": {
              "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor/wallet/adjust",
              "protocol": "https",
              "host": ["divinebackend-v5gl", "onrender", "com"],
              "path": ["api", "admin", "donor", "wallet", "adjust"]
            }
          }
        },
        {
          "name": "Update Dynamic Policy Text",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"key\": \"privacy\",\n  \"title\": \"Privacy Policy Settings\",\n  \"content\": \"### 1. Information Protection\\nYour wallet logs are secured by military-grade encryption ledger lines.\"\n}"
            },
            "url": {
              "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor/content",
              "protocol": "https",
              "host": ["divinebackend-v5gl", "onrender", "com"],
              "path": ["api", "admin", "donor", "content"]
            }
          }
        }
      ]
    };
  }

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
  console.log('Successfully updated Postman collection with the dynamic modular routes!');
} catch (err) {
  console.error('Error modifying Postman collection: ', err.message);
  process.exit(1);
}
