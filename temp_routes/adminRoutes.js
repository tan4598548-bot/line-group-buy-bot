import express from "express";
import productService from "../services/productService.js";
import arrivedService from "../services/arrivedService.js";
import shippingService from "../services/shippingService.js";
import pdfService from "../services/pdfService.js";
import adminAuth from "../middlewares/adminAuth.js";

const router = express.Router();

/* =========================
   🔐 管理員全域驗證
========================= */
router.use(adminAuth);

/* =========================
   管理員 Ping
========================= */
router.get("/ping", (req, res) => {
  res.json({
    ok: true,
    admin: req.adminUserId
  });
});

/* =========================
   商品管理
========================= */

// 取得未結單商品
router.get("/products/open", async (req, res) => {
  const products = await productService.getOpenProducts();
  res.json(products);
});

// 建立商品
router.post("/products/create", async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.json(product);
});

/* =========================
   到貨點貨
========================= */

// 到貨清單
router.get("/arrival/list", async (req, res) => {
  const list = await arrivedService.getArrivalList();
  res.json(list);
});

// 確認到貨
router.post("/arrival/confirm", async (req, res) => {
  const { id, arrivedQty } = req.body;
  await arrivedService.confirmArrival(id, arrivedQty);
  res.json({ success: true });
});

// 清空到貨暫存
router.post("/arrival/clear", async (req, res) => {
  await arrivedService.clearArrived();
  res.json({ success: true });
});

/* =========================
   發貨 / PDF
========================= */

// 出貨名單
router.get("/shipping/list", async (req, res) => {
  const list = await shippingService.getShippingBuyers();
  res.json(list);
});

// 單一買家揀貨單 PDF
router.get("/shipping/pdf", async (req, res) => {
  const { lineId } = req.query;

  if (!lineId) {
    return res.status(400).json({ error: "缺少 lineId" });
  }

  const pdfBuffer = await pdfService.generateBuyerPackingPdf(lineId);
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdfBuffer);
});

export default router;
