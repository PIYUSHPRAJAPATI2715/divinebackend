const express = require('express');
const router = express.Router();

const profileRouter = require('./profile');
const walletRouter = require('./wallet');
const campaignsRouter = require('./campaigns');
const socialRouter = require('./social');
const helpRouter = require('./help');
const referralsRouter = require('./referrals');

router.use('/', profileRouter);
router.use('/', walletRouter);
router.use('/', campaignsRouter);
router.use('/', socialRouter);
router.use('/', helpRouter);
router.use('/', referralsRouter);

module.exports = router;
