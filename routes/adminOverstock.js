import express from "express";
import adminAuth from "../middlewares/adminAuth.js";
import {
  getAllOverstockOrders,
  markOverstockOrdersShipped
} from "../services/overstockSheetService.js";
import { generateOverstockShippingPdf } from "../services/overstockPdfService.js";

const router = express.Router();
router.use(adminAuth);

// 查詢
router.get("/orders", async (req, res) => {
  res.json(await getAllOverstockOrders());
});

// 標記出貨
router.post("/ship", async (req, res) => {
  const { orderIds } = req.body;
  await markOverstockOrdersShipped(orderIds);
  res.json({ ok: true });
});

// 🔥 產生 PDF
router.get("/shipping-pdf", async (req, res) => {
  const orders = await getAllOverstockOrders();
  const shipped = orders.filter(o => o.status === "shipped");

  if (!shipped.length) {
    return res.status(400).json({ error: "無可列印資料" });
  }

  const file = await generateOverstockShippingPdf(shipped);
  res.json({ pdfUrl: `/pdf/${file}` });
});

export default router;
