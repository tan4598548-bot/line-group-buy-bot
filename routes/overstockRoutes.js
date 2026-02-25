const express = require('express');
const router = express.Router();
const vendorService = require('../services/vendorService');
const verifyAdmin = require('../middleware/adminAuth');

// 向廠商下單（管理員）
router.post('/', verifyAdmin, async (req, res) => {
  try {
    await vendorService.createVendorOrder(req.body);
    res.json({ message: 'Vendor order created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查詢廠商下單紀錄
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const data = await vendorService.getVendorOrders();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
