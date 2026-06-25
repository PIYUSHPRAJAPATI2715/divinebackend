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
    
    // Auto-sync indexes to fix existing non-sparse unique indexes (e.g. email_1 on Atlas)
    const User = require('./models/User');
    try {
      // 1. Cleanup any null or empty string emails by unsetting them
      const cleanResult = await User.updateMany(
        { $or: [ { email: null }, { email: "" } ] },
        { $unset: { email: "" } }
      );
      console.log(`Cleaned up email fields (unset null/empty values) for users.`);
      
      // 2. Sync database schema indexes
      await User.syncIndexes();
      console.log('Successfully synced database schema indexes.');
    } catch (err) {
      console.log('Failed to sync indexes directly, attempting manual cleanup of email_1 index...', err.message);
      try {
        await User.collection.dropIndex('email_1');
        console.log('Successfully dropped old email_1 index.');
        // Unset email fields again just in case before re-syncing
        await User.updateMany(
          { $or: [ { email: null }, { email: "" } ] },
          { $unset: { email: "" } }
        );
        await User.syncIndexes();
        console.log('Re-synced database schema indexes successfully.');
      } catch (dropErr) {
        console.log('Error rebuilding indexes:', dropErr.message);
      }
    }
    
    // Auto-seed cloud database if it is empty or missing Daan categories!
    // This ensures prototype data is populated on newly connected databases without wiping active data
    const Admin = require('./models/Admin');
    const DanCategory = require('./models/DanCategory');
    const adminCount = await Admin.countDocuments({});
    const danCatCount = await DanCategory.countDocuments({});
    
    if (adminCount === 0 || danCatCount === 0) {
      console.log('Detected empty cloud database or missing Daan data. Seeding collections...');
      await seedDatabase();
    } else {
      console.log('Database already contains records. Skipping auto-seeding.');
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
