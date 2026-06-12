const mongoose = require('mongoose');
const NGO = require('../models/NGO');

const URI = "mongodb+srv://Admin:quoqLu5zKLYmKciV@cluster0.rgkjhjo.mongodb.net/?appName=Cluster0"; 

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('Connected!');

  const ngos = await NGO.find({});
  console.log(`Found ${ngos.length} NGOs in total:`);
  
  ngos.forEach(ngo => {
    console.log(`- ID: ${ngo.ngoId} | Name: ${ngo.name} | Status: "${ngo.status}" | DB ID: ${ngo._id}`);
  });

  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch(console.error);
