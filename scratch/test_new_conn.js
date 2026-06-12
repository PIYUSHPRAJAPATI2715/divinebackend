const mongoose = require('mongoose');

const URI = "mongodb+srv://Admin:KVDkPaXDO2SLqL3U@cluster0.rgkjhjo.mongodb.net/divinenakshatra?appName=Cluster0"; 

async function run() {
  console.log('Connecting to MongoDB with new credentials...');
  await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Success! Connected to MongoDB Atlas.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
