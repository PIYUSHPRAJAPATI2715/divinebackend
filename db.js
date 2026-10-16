const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
const mongoose = require('mongoose');
const { seedDatabase } = require('./seeder');

let mongod = null;

async function connectDB() {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/divinenakshatra';
  
  try {
    if (uri.startsWith('mongodb')) {
      // Temporarily replace protocol to parse via standard URL constructor
      const urlObj = new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
      if (!urlObj.pathname || urlObj.pathname === '/') {
        const qIndex = uri.indexOf('?');
        let prefix = qIndex !== -1 ? uri.slice(0, qIndex) : uri;
        const suffix = qIndex !== -1 ? uri.slice(qIndex) : '';
        if (prefix.endsWith('/')) {
          prefix = prefix + 'divinenakshatra';
        } else {
          prefix = prefix + '/divinenakshatra';
        }
        uri = prefix + suffix;
      }
    }
  } catch (parseErr) {
    console.log('Database URI parsing check skipped:', parseErr.message);
  }

  try {
    console.log(`Attempting to connect to MongoDB...`);
    // Connect with a 3-second timeout to check if a local/cloud Mongo is running
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('Successfully connected to MongoDB.');
    
    // Auto-sync indexes to fix existing non-sparse unique indexes (e.g. email_1 & phone_1 on Atlas)
    const User = require('./models/User');
    try {
      // 1. Cleanup any null or empty string emails and phone numbers by unsetting them
      await User.updateMany(
        { $or: [{ email: null }, { email: "" }] },
        { $unset: { email: "" } }
      );
      await User.updateMany(
        { $or: [{ phone: null }, { phone: "" }] },
        { $unset: { phone: "" } }
      );
      console.log('Cleaned up email and phone fields (unset null/empty values) for users.');

      // 2. Drop legacy non-sparse indexes if they exist
      try { await User.collection.dropIndex('email_1'); } catch (e) {}
      try { await User.collection.dropIndex('phone_1'); } catch (e) {}

      // 3. Sync database schema indexes (with sparse: true)
      await User.syncIndexes();
      console.log('Successfully synced database schema sparse indexes.');

      // 4. Sync Daan collection indexes and sanitize any heavy base64 images
      const DanCategory = require('./models/DanCategory');
      const DanSubcategory = require('./models/DanSubcategory');
      const DanItem = require('./models/DanItem');
      await Promise.allSettled([
        DanCategory.syncIndexes(),
        DanSubcategory.syncIndexes(),
        DanItem.syncIndexes()
      ]);
      console.log('Successfully synced Daan collection indexes.');

      // Sanitize legacy base64 images in Daan collections to drastically reduce payload sizes and speed up queries
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const saveBase64ToFile = (base64Str, prefix = 'dan') => {
        if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) return null;
        try {
          const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) return null;
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace('svg+xml', 'svg');
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          return `http://195.35.20.150:8000/uploads/${filename}`;
        } catch (e) {
          return null;
        }
      };

      const base64Cats = await DanCategory.find({ imageUrl: { $regex: /^data:image\// } });
      for (const cat of base64Cats) {
        const fileUrl = saveBase64ToFile(cat.imageUrl, 'cat');
        if (fileUrl) {
          cat.imageUrl = fileUrl;
          await cat.save();
        }
      }

      const base64Subs = await DanSubcategory.find({ imageUrl: { $regex: /^data:image\// } });
      for (const sub of base64Subs) {
        const fileUrl = saveBase64ToFile(sub.imageUrl, 'sub');
        if (fileUrl) {
          sub.imageUrl = fileUrl;
          await sub.save();
        }
      }

      const base64Items = await DanItem.find({ imageUrl: { $regex: /^data:image\// } });
      for (const it of base64Items) {
        const fileUrl = saveBase64ToFile(it.imageUrl, 'item');
        if (fileUrl) {
          it.imageUrl = fileUrl;
          await it.save();
        }
      }

      const Banner = require('./models/Banner');
      const base64Banners = await Banner.find({
        $or: [
          { imageUrl: { $regex: /^data:/ } },
          { image: { $regex: /^data:/ } },
          { mediaUrl: { $regex: /^data:/ } }
        ]
      });
      for (const b of base64Banners) {
        let modified = false;
        if (b.imageUrl && b.imageUrl.startsWith('data:')) {
          const fileUrl = saveBase64ToFile(b.imageUrl, 'bnr');
          if (fileUrl) { b.imageUrl = fileUrl; modified = true; }
        }
        if (b.image && b.image.startsWith('data:')) {
          const fileUrl = saveBase64ToFile(b.image, 'bnr');
          if (fileUrl) { b.image = fileUrl; modified = true; }
        }
        if (b.mediaUrl && b.mediaUrl.startsWith('data:')) {
          const fileUrl = saveBase64ToFile(b.mediaUrl, 'bnr');
          if (fileUrl) { b.mediaUrl = fileUrl; modified = true; }
        }
        if (modified) {
          await b.save();
        }
      }
    } catch (err) {
      console.log('Index sync note:', err.message);
    }
    
    // Ensure default Admin account exists so admin panel is always accessible
    const Admin = require('./models/Admin');
    const adminCount = await Admin.countDocuments({});
    if (adminCount === 0) {
      const adminId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c79');
      await Admin.create({ _id: adminId, email: 'admin@astroadvyc.com', password: 'password123' });
      console.log('Default Admin account created (admin@astroadvyc.com).');
    } else {
      console.log('Admin account verified.');
    }

    // Ensure default WalletSettings exist for platform operations
    const WalletSettings = require('./models/WalletSettings');
    const wsCount = await WalletSettings.countDocuments({});
    if (wsCount === 0) {
      await WalletSettings.create({
        settingsId: 'GLOBAL_SETTINGS',
        coinsPerRupee: 10,
        coinRedeemLotSize: 2500,
        cashbackExpiryDays: 15,
        cashbackMaxRedeemPercent: 20,
        predefinedRechargeTiers: [
          { tierId: 'TIER-100', amount: 100, cashback: 10, bonusCoins: 100, badgeText: '', description: 'Recharge ₹100 & get ₹10 Cashback + 100 Coins', isActive: true },
          { tierId: 'TIER-500', amount: 500, cashback: 50, bonusCoins: 500, badgeText: 'Popular', description: 'Recharge ₹500 & get ₹50 Cashback + 500 Coins', isActive: true },
          { tierId: 'TIER-1000', amount: 1000, cashback: 150, bonusCoins: 1000, badgeText: 'Best Value', description: 'Recharge ₹1,000 & get ₹150 Cashback + 1,000 Coins', isActive: true },
          { tierId: 'TIER-2000', amount: 2000, cashback: 400, bonusCoins: 2500, badgeText: 'Super Saver', description: 'Recharge ₹2,000 & get ₹400 Cashback + 2,500 Coins', isActive: true },
          { tierId: 'TIER-5000', amount: 5000, cashback: 1200, bonusCoins: 5000, badgeText: 'Mega Booster', description: 'Recharge ₹5,000 & get ₹1,200 Cashback + 5,000 Coins', isActive: true }
        ]
      });
      console.log('Default WalletSettings initialized.');
    }
  } catch (err) {
    console.log('MongoDB connection failed. Initializing In-Memory MongoDB Server...');
    
    try {
      // Dynamic import to prevent crashes in production/Render if devDependencies are not installed
      const { MongoMemoryServer } = require('mongodb-memory-server');
      
      mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      console.log(`In-Memory MongoDB Server started at: ${memoryUri}`);
      
      // Connect to the in-memory MongoDB instance
      await mongoose.connect(memoryUri);
      console.log('Successfully connected to In-Memory MongoDB.');
      
      // Automatically seed the in-memory database so it's ready for use!
      console.log('Automatically seeding the In-Memory Database...');
      await seedDatabase();
    } catch (err2) {
      console.error('Failed to initialize In-Memory MongoDB. Please configure MONGODB_URI environment variable.');
      console.error('Error details:', err2.message);
      throw err; // Throw original connection error to halt boot
    }
  }
}

async function closeDB() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

module.exports = { connectDB, closeDB };
