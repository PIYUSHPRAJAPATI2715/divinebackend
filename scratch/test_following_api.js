const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const NGO = require('../models/NGO');
const { handleFollowing, handleFollowers, handleSocialOverview } = require('../routes/donor/social');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    // Test 1: Shubham Raj following Divine Foundation
    const user1 = await User.findOne({ name: 'Shubham Raj' });
    console.log('\n=============================================');
    console.log('TEST 1: User Shubham Raj following Divine Foundation (0 reviews)');
    console.log('=============================================');

    let result1 = null;
    const mockRes1 = {
      json: (data) => { result1 = data; },
      status: (code) => ({ json: (d) => console.error('Status:', code, d) })
    };

    await handleFollowing({ user: { _id: user1._id, id: user1._id }, baseUrl: '/api/following' }, mockRes1);
    console.log('Following count:', result1.followingCount);
    result1.data.forEach(item => {
      console.log(`[${item.type}] Name: "${item.name}"`);
      console.log(`  Logo: ${item.logo}`);
      console.log(`  Rating: ${item.rating}`);
      console.log(`  RatingValue: ${item.ratingValue}`);
      console.log(`  ReviewsCount: ${item.reviewsCount}`);
    });

    // Test 2: User Yhhhvvv following Karan Motors
    const user2 = await User.findOne({ name: 'Yhhhvvv' });
    console.log('\n=============================================');
    console.log('TEST 2: User Yhhhvvv following Karan Motors');
    console.log('=============================================');

    let result2 = null;
    const mockRes2 = {
      json: (data) => { result2 = data; },
      status: (code) => ({ json: (d) => console.error('Status:', code, d) })
    };

    await handleFollowing({ user: { _id: user2._id, id: user2._id }, baseUrl: '/api/following' }, mockRes2);
    console.log('Following count:', result2.followingCount);
    result2.data.forEach(item => {
      console.log(`[${item.type}] Name: "${item.name}"`);
      console.log(`  Logo: ${item.logo}`);
      console.log(`  Rating: ${item.rating}`);
      console.log(`  RatingValue: ${item.ratingValue}`);
      console.log(`  ReviewsCount: ${item.reviewsCount}`);
    });

    // Test 3: Temporarily test following NGO Yhhhvvv (which has 2 approved reviews, avg rating 4.5)
    console.log('\n=============================================');
    console.log('TEST 3: User following NGO Yhhhvvv (NGO with 2 approved reviews, avg 4.5)');
    console.log('=============================================');

    const ngoWithReviews = await NGO.findOne({ name: 'Yhhhvvv' });
    user1.followingNgos.push(ngoWithReviews._id);
    await user1.save();

    let result3 = null;
    const mockRes3 = {
      json: (data) => { result3 = data; },
      status: (code) => ({ json: (d) => console.error('Status:', code, d) })
    };

    await handleFollowing({ user: { _id: user1._id, id: user1._id }, baseUrl: '/api/following' }, mockRes3);
    console.log('Following count:', result3.followingCount);
    result3.data.forEach(item => {
      console.log(`[${item.type}] Name: "${item.name}"`);
      console.log(`  Logo: ${item.logo}`);
      console.log(`  Rating: ${item.rating}`);
      console.log(`  RatingValue: ${item.ratingValue}`);
      console.log(`  ReviewsCount: ${item.reviewsCount}`);
    });

    // Clean up temporary follow
    user1.followingNgos = user1.followingNgos.filter(id => id.toString() !== ngoWithReviews._id.toString());
    await user1.save();

    console.log('\nTests completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
