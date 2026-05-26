const mongoose = require('mongoose');
require('dotenv').config();
const { seedDatabase } = require('./seeder');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/divinenakshatra')
.then(async () => {
  console.log('Connected to DB, initializing seeding...');
  await seedDatabase();
  process.exit(0);
})
.catch((err) => {
  console.error('Error seeding database: ', err.message);
  process.exit(1);
});
