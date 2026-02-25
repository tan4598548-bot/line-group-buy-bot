const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const verifyAdmin = require('../middleware/adminAuth');

// 取得上架商品（團友）
router.get('/', async (req, res) => {
  try {
    const data = await productService.getAllProducts();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 管理員強制結單
router.post('/close/:code', verifyAdmin, async (req, res) => {
  try {
    await productService.closeProduct(req.params.code);
    res.json({ message: 'Product closed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
