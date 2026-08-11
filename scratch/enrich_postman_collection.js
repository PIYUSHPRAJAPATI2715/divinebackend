const fs = require('fs');
const path = require('path');

const oldCollection = JSON.parse(fs.readFileSync(path.join(__dirname, 'old_postman.json'), 'utf8'));

console.log('Top level folders in original collection:');
oldCollection.item.forEach((folder, i) => {
  console.log(`${i + 1}. ${folder.name}`);
});

// New Social Feed & Followers requests
const socialRequests = [
  {
    name: "Get My Following List (NGOs & Users with isFollowing: true)",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/donor/following", host: ["{{baseUrl}}"], path: ["api", "donor", "following"] }
    }
  },
  {
    name: "Get My Followers List (Users following me with isFollowing back state)",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/donor/followers", host: ["{{baseUrl}}"], path: ["api", "donor", "followers"] }
    }
  },
  {
    name: "Get Social Dashboard & Leaderboard",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/donor/social", host: ["{{baseUrl}}"], path: ["api", "donor", "social"] }
    }
  },
  {
    name: "Discover NGOs & Donors to Follow (with dynamic isFollowing boolean)",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/donor/discover", host: ["{{baseUrl}}"], path: ["api", "donor", "discover"] }
    }
  },
  {
    name: "Check Follow Status for Specific NGO/User ID",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/donor/follow/check/6671c22d1ce70b55582f0c7b", host: ["{{baseUrl}}"], path: ["api", "donor", "follow", "check", "6671c22d1ce70b55582f0c7b"] }
    }
  },
  {
    name: "Toggle Follow / Unfollow (Unified Endpoint)",
    request: {
      method: "POST",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/donor/follow/6671c22d1ce70b55582f0c7b", host: ["{{baseUrl}}"], path: ["api", "donor", "follow", "6671c22d1ce70b55582f0c7b"] }
    }
  },
  {
    name: "Follow NGO Explicitly",
    request: {
      method: "POST",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/donor/follow/ngo/6671c22d1ce70b55582f0c7b", host: ["{{baseUrl}}"], path: ["api", "donor", "follow", "ngo", "6671c22d1ce70b55582f0c7b"] }
    }
  },
  {
    name: "Follow User Explicitly",
    request: {
      method: "POST",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/donor/follow/user/6a51f46231a397451edd4bda", host: ["{{baseUrl}}"], path: ["api", "donor", "follow", "user", "6a51f46231a397451edd4bda"] }
    }
  }
];

// Fundraiser category requests
const categoryRequests = [
  {
    name: "Get All Fundraiser Categories (Public / App)",
    request: {
      method: "GET",
      url: { raw: "{{baseUrl}}/api/donor/campaign-categories", host: ["{{baseUrl}}"], path: ["api", "donor", "campaign-categories"] }
    }
  },
  {
    name: "Get Fundraiser Categories (Admin)",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{token}}" }],
      url: { raw: "{{baseUrl}}/api/admin/campaign-categories", host: ["{{baseUrl}}"], path: ["api", "admin", "campaign-categories"] }
    }
  },
  {
    name: "Create Fundraiser Category (Admin)",
    request: {
      method: "POST",
      header: [
        { key: "Content-Type", value: "application/json" },
        { key: "Authorization", value: "Bearer {{token}}" }
      ],
      body: {
        mode: "raw",
        raw: JSON.stringify({
          name: "Spiritual & Temple Welfare",
          icon: "🛕",
          imageUrl: "https://images.unsplash.com/photo-1600100397990-a4a8ec90966a",
          description: "Temple maintenance and bhandara prasad distribution."
        }, null, 2)
      },
      url: { raw: "{{baseUrl}}/api/admin/campaign-categories", host: ["{{baseUrl}}"], path: ["api", "admin", "campaign-categories"] }
    }
  }
];

// Daan Subcategory & Items requests
const danSubcategoryRequests = [
  {
    name: "Get Daan Subcategories (Category Filtered)",
    request: {
      method: "GET",
      url: { raw: "{{baseUrl}}/api/dan/subcategories?categoryId=CAT-FOOD", host: ["{{baseUrl}}"], path: ["api", "dan", "subcategories"], query: [{ key: "categoryId", value: "CAT-FOOD" }] }
    }
  },
  {
    name: "Get Daan Items (Category Filtered)",
    request: {
      method: "GET",
      url: { raw: "{{baseUrl}}/api/dan/items?categoryId=CAT-FOOD", host: ["{{baseUrl}}"], path: ["api", "dan", "items"], query: [{ key: "categoryId", value: "CAT-FOOD" }] }
    }
  }
];

// Locate User & Client APIs -> Social Feed & Followers
let userClientFolder = oldCollection.item.find(i => i.name.includes("User & Client"));
if (userClientFolder && Array.isArray(userClientFolder.item)) {
  let socialFolder = userClientFolder.item.find(i => i.name.includes("Social Feed"));
  if (socialFolder) {
    socialFolder.item = socialRequests;
    console.log('✅ Updated "Social Feed & Followers" inside User & Client APIs!');
  } else {
    userClientFolder.item.push({ name: "6, 14. Social Feed & Followers", item: socialRequests });
  }

  let campaignsFolder = userClientFolder.item.find(i => i.name.includes("Campaigns"));
  if (campaignsFolder && Array.isArray(campaignsFolder.item)) {
    campaignsFolder.item.push(...categoryRequests);
  }
}

// Locate top-level folder if present
let topSocialFolder = oldCollection.item.find(i => i.name.includes("Social Feed"));
if (topSocialFolder) {
  topSocialFolder.item = socialRequests;
  console.log('✅ Updated top-level "Social Feed & Followers" folder!');
} else {
  oldCollection.item.push({ name: "6, 14. Social Feed & Followers", item: socialRequests });
}

oldCollection.item.push({ name: "24. Fundraiser Categories APIs", item: categoryRequests });
oldCollection.item.push({ name: "25. Daan Subcategories & Items Filtered APIs", item: danSubcategoryRequests });

const updatedStr = JSON.stringify(oldCollection, null, 2);
fs.writeFileSync(path.join(__dirname, '..', 'postman_collection.json'), updatedStr);
fs.writeFileSync('C:\\Users\\AB COM\\.gemini\\antigravity\\brain\\6178f60a-d5db-4dc0-b81c-9decb865f08b\\divine_api_collection.json', updatedStr);

console.log('🎉 Successfully enriched postman_collection.json!');
