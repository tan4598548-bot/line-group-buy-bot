import express from "express";
import adminAuth from "../middlewares/adminAuth.js";
import {
  createProduct,
  updateProductStatus,
  closeProduct
} from "../services/productService.js";

const router = express.Router();

/* =========================
   管理員：新增商品
========================= */
router.post("/products/create", adminAuth, async (req, res) => {
  await createProduct(req.body);
  res.json({ ok: true });
});

/* =========================
   管理員：上下架
========================= */
router.post("/products/active", adminAuth, async (req, res) => {
  const { productCode, active } = req.body;
  await updateProductStatus(productCode, active);
  res.json({ ok: true });
});

/* =========================
   管理員：結單
========================= */
router.post("/products/close", adminAuth, async (req, res) => {
  const { productCode } = req.body;
  await closeProduct(productCode);
  res.json({ ok: true });
});

export default router;
