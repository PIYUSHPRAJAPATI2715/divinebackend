const express = require('express');
const router = express.Router();

const profileRouter = require('./profile');
const walletRouter = require('./wallet');
const campaignsRouter = require('./campaigns');
const socialRouter = require('./social');
const helpRouter = require('./help');

router.use('/', profileRouter);
router.use('/', walletRouter);
router.use('/', campaignsRouter);
router.use('/', socialRouter);
router.use('/', helpRouter);

module.exports = router;
