const express = require('express');
const router = express.Router();

const ticketsRouter = require('./tickets');
const couponsRouter = require('./coupons');
const notificationsRouter = require('./notifications');
const walletRouter = require('./wallet');
const contentRouter = require('./content');

router.use('/', ticketsRouter);
router.use('/', couponsRouter);
router.use('/', notificationsRouter);
router.use('/', walletRouter);
router.use('/', contentRouter);

module.exports = router;
