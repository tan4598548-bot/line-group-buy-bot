import express from "express";
import adminAuth from "../middlewares/adminAuth.js";
import { markArrived } from "../services/arrivedService.js";

const router = express.Router();

/* =========================
   管理員：到貨點貨
========================= */
router.post("/arrival", adminAuth, async (req, res) => {
  const { productCode, arrivedQty } = req.body;

  if (!productCode || arrivedQty == null) {
    return res.status(400).json({ error: "缺少參數" });
  }

  try {
    await markArrived(productCode, Number(arrivedQty));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
