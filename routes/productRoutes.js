import express from 'express';
import { sheetService } from '../services/sheetService.js';

const router = express.Router();

// 1. 取得商品清單 (支援 filter=active 或 overstock)
router.get('/products', async (req, res) => {
  try {
    const data = await sheetService.getProducts(req.query.filter);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 管理端：新增上架商品 (對應前端的 /api/admin/products)
router.post('/admin/products', async (req, res) => {
  try {
    await sheetService.appendProduct(req.body);
    res.json({ ok: true, message: "上架成功" });
  } catch (err) {
    console.error("上架報錯:", err);
    res.status(400).json({ error: err.message });
  }
});

// 3. 管理員：強制結單
router.post('/products/close/:code', async (req, res) => {
  try {
    // 實作略，可根據需要擴充更新 Sheet 狀態邏輯
    res.json({ message: 'Product status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;