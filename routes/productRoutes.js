import express from 'express';
import sheetService from '../services/sheetService.js';

const router = express.Router();

// 取得商品清單 (團友/管理員)
router.get('/products', async (req, res) => {
  try {
    const data = await sheetService.getProducts(req.query.filter);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 管理員更新商品狀態 (結單/斷貨/刪除)
router.put('/products/:code/status', async (req, res) => {
  try {
    const { code } = req.params;
    const { status } = req.body;
    await sheetService.updateProductStatus(code, status);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 管理員新增商品
router.post('/admin/products', async (req, res) => {
  try {
    await sheetService.appendProduct(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;