import express from "express";
import adminAuth from "../middlewares/adminAuth.js";
import {
  getShippingList,
  markOrdersShipped
} from "../services/shippingService.js";
import { generateShippingPdf } from "../services/pdfService.js";
import path from "path";

const router = express.Router();

/* =========================
   管理員：出貨清單
========================= */
router.get("/shipping-list", adminAuth, async (req, res) => {
  const list = await getShippingList();
  res.json(list);
});

/* =========================
   管理員：出貨 + PDF
========================= */
router.post("/ship", adminAuth, async (req, res) => {
  const { orderIds } = req.body;

  if (!orderIds?.length) {
    return res.status(400).json({ error: "未選擇訂單" });
  }

  const shipped = await markOrdersShipped(orderIds);
  const pdfPath = await generateShippingPdf(shipped);

  res.json({
    ok: true,
    pdfUrl: `/pdf/${path.basename(pdfPath)}`
  });
});

export default router;
