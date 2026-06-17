const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', 'postman_collection.json');

const donorPortalFolder = {
  "name": "Donor Portal APIs",
  "description": "Donor portal endpoints for notifications, profile updates, searches, wallet topups/sponsorships, leaderboards, reviews, referrals, and help tickets.",
  "item": [
    {
      "name": "Get Donor Profile",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/profile",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "profile"]
        }
      }
    },
    {
      "name": "Update Profile Settings",
      "request": {
        "method": "PUT",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Alex Donor\",\n  \"email\": \"alex.donor@example.com\",\n  \"gender\": \"Male\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/profile",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "profile"]
        }
      }
    },
    {
      "name": "Wallet Details & Ledger",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/wallet",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "wallet"]
        }
      }
    },
    {
      "name": "Wallet Top-up Simulation",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"amount\": 2000\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/auth/wallet/topup",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "auth", "wallet", "topup"]
        }
      }
    },
    {
      "name": "Wallet Sponsor Donation",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"campaignId\": \"REPLACE_WITH_CAMPAIGN_OBJECT_ID\",\n  \"amount\": 500\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/auth/wallet/donate",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "auth", "wallet", "donate"]
        }
      }
    },
    {
      "name": "Get Notifications",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/notifications",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "notifications"]
        }
      }
    },
    {
      "name": "Get Recent Searches",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/recent-searches",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "recent-searches"]
        }
      }
    },
    {
      "name": "Follow NGO Toggle",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/follow/ngo/:id",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "follow", "ngo", ":id"],
          "variable": [{ "key": "id", "value": "REPLACE_WITH_NGO_OBJECT_ID" }]
        }
      }
    },
    {
      "name": "Claim Promo Coupon",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"code\": \"WELCOME100\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/coupons/claim",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "coupons", "claim"]
        }
      }
    },
    {
      "name": "Raise Sponsoring Campaign",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"Community Village Food Kitchen Campaign\",\n  \"category\": \"Community Welfare\",\n  \"goal\": 80000,\n  \"description\": \"Help us set up a daily free kitchen in rural areas. Serves warm meals.\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/campaigns",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "campaigns"]
        }
      }
    },
    {
      "name": "Submit Help Support Ticket",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"subject\": \"Tax Certificate Request Status\",\n  \"message\": \"Please provide verification logs for Section 80G tax benefit receipt.\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/donor/help-support",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "donor", "help-support"]
        }
      }
    }
  ]
};

const adminHelpFolder = {
  "name": "Admin Help Desk & Rewards",
  "description": "Admin controls to resolve user tickets and issue reward promo codes.",
  "item": [
    {
      "name": "Get Support Tickets",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor-help/tickets",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "admin", "donor-help", "tickets"]
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
          "raw": "{\n  \"reply\": \"Your 80G receipt has been processed. You can download it under Wallet logs.\"\n}"
        },
        "url": {
          "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor-help/tickets/:id/reply",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "admin", "donor-help", "tickets", ":id", "reply"],
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
          "raw": "https://divinebackend-v5gl.onrender.com/api/admin/donor-help/coupons",
          "protocol": "https",
          "host": ["divinebackend-v5gl", "onrender", "com"],
          "path": ["api", "admin", "donor-help", "coupons"]
        }
      }
    }
  ]
};

try {
  const fileData = fs.readFileSync(collectionPath, 'utf8');
  const collection = JSON.parse(fileData);

  // Add the Donor Portal folder to the main items
  collection.item.push(donorPortalFolder);

  // Add the Admin Help folder to the main items
  collection.item.push(adminHelpFolder);

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
  console.log('Successfully injected Donor and Admin Help endpoints into postman_collection.json!');
} catch (err) {
  console.error('Error modifying Postman collection: ', err.message);
  process.exit(1);
}
