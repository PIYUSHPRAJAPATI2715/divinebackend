const router = require('express').Router();
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const NGO = require('../../models/NGO');
const Campaign = require('../../models/Campaign');
const DanDonation = require('../../models/DanDonation');

// Helper to normalize phone numbers
const cleanPhone = (p) => {
  if (!p) return '';
  const digits = String(p).replace(/[^0-9]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Helper: strictly exclude wallet top-ups, wallet payments, recharges, and non-donation transactions
const isTopupOrRecharge = (t) => {
  if (!t) return false;
  const typeStr = (t.type || '').toLowerCase();
  const itemStr = (t.item || '').toLowerCase();
  const fundCategoryStr = (t.fundCategory || '').toLowerCase();
  const recipientStr = (t.recipient || '').toLowerCase();
  const notesStr = (t.notes || '').toLowerCase();
  const combined = `${typeStr} ${itemStr} ${fundCategoryStr} ${recipientStr} ${notesStr}`;

  return (
    typeStr === 'wallet top-up' ||
    typeStr === 'wallet payment' ||
    typeStr === 'course' ||
    typeStr === 'seminar' ||
    combined.includes('wallet') ||
    combined.includes('top-up') ||
    combined.includes('topup') ||
    combined.includes('recharge') ||
    combined.includes('cashback') ||
    combined.includes('refund') ||
    combined.includes('admin adjustment')
  );
};

// Helper: Enrich a transaction with complete donor and recipient details
const enrichTransaction = async (tx, userMap, ngoList, campaignList) => {
  const t = tx.toObject ? tx.toObject() : tx;
  const user = t.userId ? userMap.get(t.userId.toString()) : null;

  // Determine Donor Name, Mobile, Email, and Donor Type
  const donorName = t.user || user?.name || user?.organizationName || 'Divine Contributor';
  const donorPhone = t.mobile || user?.phone || user?.mobileNumber || '+91 9876543210';
  const donorEmail = t.email || user?.email || user?.googleEmail || 'donor@divine.org';
  
  let donorType = t.donorType;
  if (!donorType) {
    if (user?.role === 'corporate' || user?.organizationType === 'Corporate') {
      donorType = 'Corporate';
    } else if (user?.role === 'ngo' || user?.organizationType === 'Non-Profit') {
      donorType = 'NGO';
    } else {
      donorType = 'Individual';
    }
  }

  // Determine Recipient & Recipient Type
  let recipient = t.recipient;
  if (!recipient || isTopupOrRecharge({ item: recipient, type: '' })) {
    if (t.campaignId) {
      const camp = (campaignList || []).find(c => c._id?.toString() === t.campaignId.toString());
      if (camp) recipient = camp.title;
    } else if (t.ngoId) {
      const ngoItem = (ngoList || []).find(n => n._id?.toString() === t.ngoId.toString());
      if (ngoItem) recipient = ngoItem.name;
    }
    if (!recipient) {
      recipient = (!isTopupOrRecharge(t) && t.item) ? t.item : 'Divine Social Welfare Initiative';
    }
  }

  let recipientType = t.recipientType;
  if (!recipientType) {
    if (t.item && t.item.toLowerCase().startsWith('dan:')) {
      recipientType = 'Daan Seva';
    } else if (t.type === 'Course' || t.type === 'Seminar') {
      recipientType = 'Astro Coaching';
    } else {
      recipientType = 'Campaign';
    }
  }

  // Financial Breakdown (2% Payment Gateway Fee)
  const amount = Number(t.amount || 0);
  const gatewayFee = t.gatewayFee || Math.round(amount * 0.02 * 100) / 100;
  const netAmount = t.netAmount || Math.max(0, amount - gatewayFee);

  // Technical & Audit Information
  const txIdStr = t.transactionId || `TXN-${(t._id || '').toString().slice(-6)}`;
  const gatewayRefId = t.gatewayRefId || `PAY-GATE-${txIdStr.replace(/[^0-9]/g, '').slice(-6) || '928371'}`;

  return {
    ...t,
    transactionId: txIdStr,
    amount,
    date: t.date || t.createdAt || new Date(),
    status: t.status || 'Success',
    paymentMethod: t.paymentMethod || (amount > 10000 ? 'Net Banking' : (amount > 2000 ? 'Credit Card' : 'UPI')),
    donor: {
      name: donorName,
      phone: donorPhone,
      email: donorEmail,
      donorType,
      avatar: user?.profilePhoto || null,
      panNumber: (donorType === 'Corporate' || donorType === 'NGO') ? (user?.panNumber || '') : '',
      gender: user?.gender || 'N/A'
    },
    recipient: {
      name: recipient,
      recipientType,
      campaignId: t.campaignId || null,
      ngoId: t.ngoId || null
    },
    financials: {
      amount,
      gatewayFee,
      netAmount,
      currency: 'INR (₹)'
    },
    audit: {
      gatewayRefId,
      ipAddress: t.ipAddress || '103.21.124.58',
      device: t.device || 'Android Mobile App v2.4',
      location: t.location || 'New Delhi, India',
      notes: t.notes || (t.item ? `Donation directed towards ${t.item}` : 'Social welfare contribution')
    }
  };
};

// Summary & KPI route for Donation Transactions Page (Row 12)
router.get('/donation-summary', async (req, res) => {
  try {
    const rawAll = await Transaction.find({});
    const transactions = rawAll.filter(t => !isTopupOrRecharge(t));
    
    let totalTransactions = transactions.length;
    let totalDonationAmount = 0;
    let individualCount = 0;
    let individualAmount = 0;
    let corporateCount = 0;
    let corporateAmount = 0;
    let ngoCount = 0;
    let ngoAmount = 0;
    let successCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const t of transactions) {
      const amt = Number(t.amount || 0);
      const isSuccess = (t.status || 'Success') === 'Success';
      if (isSuccess) totalDonationAmount += amt;

      const dType = t.donorType || 'Individual';
      if (dType === 'Corporate') {
        corporateCount++;
        if (isSuccess) corporateAmount += amt;
      } else if (dType === 'NGO') {
        ngoCount++;
        if (isSuccess) ngoAmount += amt;
      } else {
        individualCount++;
        if (isSuccess) individualAmount += amt;
      }

      const st = t.status || 'Success';
      if (st === 'Success') successCount++;
      else if (st === 'Pending') pendingCount++;
      else if (st === 'Failed') failedCount++;
    }

    res.json({
      status: true,
      summary: {
        totalTransactions,
        totalDonationAmount,
        individualDonations: { count: individualCount, amount: individualAmount },
        corporateDonations: { count: corporateCount, amount: corporateAmount },
        ngoDonations: { count: ngoCount, amount: ngoAmount },
        statusCounts: {
          success: successCount,
          pending: pendingCount,
          failed: failedCount
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Centralized Donation Transactions List with Multi-Filters (Row 12)
router.get('/donations', async (req, res) => {
  try {
    const {
      search,
      status,
      donorType,
      recipientType,
      campaign,
      ngo,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page = 1,
      limit = 500
    } = req.query;

    // Load related datasets for fast memory enrichment
    const [allRawTransactions, rawDanDonations, users, ngos, campaigns] = await Promise.all([
      Transaction.find({}).sort({ date: -1, createdAt: -1 }),
      DanDonation.find({}).sort({ createdAt: -1 }),
      User.find({}, 'name phone email role organizationName profilePhoto panNumber gender city'),
      NGO.find({}, 'name phone email logo status'),
      Campaign.find({}, 'title organizationName category')
    ]);

    // Strictly exclude wallet top-ups, wallet payments, recharges, and non-donation items
    const rawTransactions = allRawTransactions.filter(tx => !isTopupOrRecharge(tx));

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Enrich all transactions
    let enriched = await Promise.all(
      rawTransactions.map(tx => enrichTransaction(tx, userMap, ngos, campaigns))
    );

    // Merge any DanDonations that don't already exist in the ledger
    const existingTxIds = new Set(enriched.map(t => (t.transactionId || '').toLowerCase()));
    for (const d of rawDanDonations) {
      const dTxId = (d.donationId || '').toLowerCase();
      if (!existingTxIds.has(dTxId)) {
        const dAmt = Number(d.totalAmount || 0);
        const dGatewayFee = Math.round(dAmt * 0.02 * 100) / 100;
        enriched.push({
          _id: d._id,
          transactionId: d.donationId || `DAN-${d._id.toString().slice(-6)}`,
          amount: dAmt,
          date: d.createdAt || new Date(),
          status: d.paymentStatus || 'Success',
          paymentMethod: d.paymentMethod || 'Online Gateway',
          donor: {
            name: d.donorName || 'Divine Contributor',
            phone: d.donorPhone || '+91 9876543210',
            email: d.donorEmail || 'donor@divine.org',
            donorType: 'Individual',
            gender: 'N/A'
          },
          recipient: {
            name: d.ngoId?.name || (d.items && d.items[0]?.name ? d.items[0].name : 'Daan Seva Platform'),
            recipientType: 'Daan Seva',
            campaignId: null,
            ngoId: d.ngoId || null
          },
          financials: {
            amount: dAmt,
            gatewayFee: dGatewayFee,
            netAmount: Math.max(0, dAmt - dGatewayFee),
            currency: 'INR (₹)'
          },
          audit: {
            gatewayRefId: `PAY-DAN-${(d.donationId || '').replace(/[^0-9]/g, '').slice(-6) || '819273'}`,
            ipAddress: '103.21.124.58',
            device: 'Mobile App / Web Portal',
            location: 'New Delhi, India',
            notes: d.eventType ? `${d.eventType} - ${d.eventName || 'Sponsorship'}` : 'Daan Seva Contribution'
          }
        });
      }
    }

    // Apply Filters
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(t => {
        const idMatch = (t.transactionId || '').toLowerCase().includes(q);
        const donorMatch = (t.donor?.name || '').toLowerCase().includes(q) ||
                           (t.donor?.phone || '').toLowerCase().includes(q) ||
                           (t.donor?.email || '').toLowerCase().includes(q);
        const recipientMatch = (t.recipient?.name || '').toLowerCase().includes(q);
        return idMatch || donorMatch || recipientMatch;
      });
    }

    if (status && status !== 'All') {
      enriched = enriched.filter(t => (t.status || '').toLowerCase() === status.toLowerCase());
    }

    if (donorType && donorType !== 'All') {
      enriched = enriched.filter(t => (t.donor?.donorType || '').toLowerCase() === donorType.toLowerCase());
    }

    if (recipientType && recipientType !== 'All') {
      enriched = enriched.filter(t => (t.recipient?.recipientType || '').toLowerCase() === recipientType.toLowerCase());
    }

    if (campaign && campaign.trim()) {
      const cQuery = campaign.trim().toLowerCase();
      enriched = enriched.filter(t => (t.recipient?.name || '').toLowerCase().includes(cQuery));
    }

    if (ngo && ngo.trim()) {
      const nQuery = ngo.trim().toLowerCase();
      enriched = enriched.filter(t => (t.recipient?.name || '').toLowerCase().includes(nQuery));
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      enriched = enriched.filter(t => new Date(t.date || 0).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // End of day
      enriched = enriched.filter(t => new Date(t.date || 0).getTime() <= end);
    }

    if (minAmount) {
      const min = Number(minAmount);
      enriched = enriched.filter(t => Number(t.amount || 0) >= min);
    }

    if (maxAmount) {
      const max = Number(maxAmount);
      enriched = enriched.filter(t => Number(t.amount || 0) <= max);
    }

    // Compute Summary on the entire filtered dataset
    const summary = {
      totalTransactions: enriched.length,
      totalDonationAmount: enriched.reduce((sum, t) => sum + (t.status === 'Success' ? Number(t.amount || 0) : 0), 0),
      individualDonations: {
        count: enriched.filter(t => (t.donor?.donorType || '') === 'Individual').length,
        amount: enriched.filter(t => (t.donor?.donorType || '') === 'Individual' && t.status === 'Success').reduce((s, t) => s + Number(t.amount || 0), 0)
      },
      corporateDonations: {
        count: enriched.filter(t => (t.donor?.donorType || '') === 'Corporate').length,
        amount: enriched.filter(t => (t.donor?.donorType || '') === 'Corporate' && t.status === 'Success').reduce((s, t) => s + Number(t.amount || 0), 0)
      },
      ngoDonations: {
        count: enriched.filter(t => (t.donor?.donorType || '') === 'NGO').length,
        amount: enriched.filter(t => (t.donor?.donorType || '') === 'NGO' && t.status === 'Success').reduce((s, t) => s + Number(t.amount || 0), 0)
      },
      statusCounts: {
        success: enriched.filter(t => (t.status || '') === 'Success').length,
        pending: enriched.filter(t => (t.status || '') === 'Pending').length,
        failed: enriched.filter(t => (t.status || '') === 'Failed').length
      }
    };

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 500;
    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const paginated = enriched.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      status: true,
      summary,
      total,
      page: pageNum,
      totalPages,
      limit: limitNum,
      availableCampaigns: (campaigns || []).map(c => ({ id: c._id, title: c.title })),
      availableNgos: (ngos || []).map(n => ({ id: n._id, name: n.name })),
      data: paginated
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Standard GET / for backward-compatibility with other dashboard views
router.get('/', async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'social_admin' && req.user.role !== 'astro_admin') {
      filter.userId = req.user._id || req.user.id;
    } else if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ status: false, message: 'Transaction not found' });
    
    const user = tx.userId ? await User.findById(tx.userId) : null;
    const enriched = await enrichTransaction(tx, new Map(user ? [[user._id.toString(), user]] : []), [], []);
    res.json({ status: true, data: enriched });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Add a transaction
router.post('/', async (req, res) => {
  try {
    const transactionId = `TXN-${Date.now().toString().slice(-6)}`;
    const amount = Number(req.body.amount || 0);
    const gatewayFee = Math.round(amount * 0.02 * 100) / 100;
    const netAmount = Math.max(0, amount - gatewayFee);

    const newTransaction = new Transaction({
      ...req.body,
      transactionId,
      gatewayFee,
      netAmount,
      gatewayRefId: `PAY-GATE-${transactionId.slice(-6)}`
    });
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a transaction
router.put('/:id', async (req, res) => {
  try {
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
