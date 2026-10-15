const router = require('express').Router();
const Transaction = require('../../models/Transaction');

// Get transactions (strictly user-isolated for non-admin users)
router.get('/', async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.role !== 'admin') {
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

// Add a transaction
router.post('/', async (req, res) => {
  try {
    const transactionId = `TXN-${Date.now().toString().slice(-4)}`;
    const newTransaction = new Transaction({ ...req.body, transactionId });
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
