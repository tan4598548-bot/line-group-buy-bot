import express from 'express';
import { sheetService } from '../services/sheetService.js';

const router = express.Router();

// 1. 取得商品清單 (團友用)
router.get('/products', async (req, res) => {
  try {
    const data = await sheetService.getProducts(req.query.filter);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 管理端：新增商品 (POST /api/admin/products)
// 確保這裡的路徑與前端 fetch 一致
router.post('/admin/products', async (req, res) => {
  try {
    console.log("收到上架請求:", req.body);
    await sheetService.appendProduct(req.body);
    res.json({ ok: true, message: "上架成功" });
  } catch (err) {
    console.error("上架失敗詳情:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;