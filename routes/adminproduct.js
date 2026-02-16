import express from "express";
import adminAuth from "../middlewares/adminAuth.js";
import {
  createProduct,
  updateProductStatus,
  closeProduct,
  getDetail
} from "../services/productService.js";

const router = express.Router();

// 管理員：新增商品
router.post("/products/create", adminAuth, async (req, res) => {
  try {
    await createProduct(req.body);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// 管理員：取得單一商品詳情
router.get("/product-detail/:code", async (req, res) => {
  try {
    const data = await getDetail(req.params.code);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/products/active", adminAuth, async (req, res) => {
  const { productCode, active } = req.body;
  await updateProductStatus(productCode, active);
  res.json({ ok: true });
});

router.post("/products/close", adminAuth, async (req, res) => {
  const { productCode } = req.body;
  await closeProduct(productCode);
  res.json({ ok: true });
});

export default router;