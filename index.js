import express from "express";
import fs from "fs";
import path from "path";

import {
  getProducts,
  updateProductStatus,
  markProductClosed,
  getBuyerOrders,
  getShippingList,
  markOrdersShipped,
  getBuyerPendingOrders,
  getProductsClosingTomorrow,
  getBuyerPackingList
} from "./services/sheetService.js";

import { handleOrder } from "./services/orderService.js";
import { generateShippingPdf } from "./services/pdfService.js";
import { generateBuyerPackingPdf } from "./services/buyerPackingPdfService.js";

const app = express();

app.use(express.json());
app.use(express.static("public"));

/* =====================
   商品清單
===================== */
app.get("/api/products", async (req, res) => {
  try {
    res.json(await getProducts());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   商品上下架
===================== */
app.post("/api/product/active", async (req, res) => {
  try {
    const { productCode, active } = req.body;
    await updateProductStatus(productCode, active);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* =====================
   商品結單
===================== */
app.post("/api/product/close", async (req, res) => {
  try {
    const { productCode } = req.body;
    await markProductClosed(productCode);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* =====================
   買家訂單
===================== */
app.get("/api/buyer/orders", async (req, res) => {
  try {
    res.json(await getBuyerOrders(req.query.userId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   管理：出貨清單
===================== */
app.get("/api/admin/shipping-list", async (req, res) => {
  try {
    res.json(await getShippingList());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   管理：標記出貨 + PDF
===================== */
app.post("/api/admin/ship", async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds?.length) {
      return res.status(400).json({ error: "未選擇出貨項目" });
    }

    const shipped = await markOrdersShipped(orderIds);
    const pdfPath = await generateShippingPdf(shipped);

    res.json({
      ok: true,
      pdfUrl: `/pdf/${path.basename(pdfPath)}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   管理：買家揀貨 PDF
===================== */
app.get("/api/admin/buyer-packing-pdf", async (req, res) => {
  try {
    const list = await getBuyerPackingList();
    if (!list.length) {
      return res.status(400).json({ error: "目前無可列印資料" });
    }

    const pdfPath = await generateBuyerPackingPdf(list);
    res.json({
      ok: true,
      pdfUrl: `/pdf/${path.basename(pdfPath)}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   結單提醒文案
===================== */
app.get("/api/admin/close-reminder", async (req, res) => {
  try {
    const products = await getProductsClosingTomorrow();
    if (!products.length) {
      return res.json({ text: "明日無即將結單商品" });
    }

    const list = products.map((p, i) => `${i + 1}. ${p.productName}`).join("\n");
    res.json({
      text: `⚠️【結單提醒】\n\n${list}\n\n請盡速下單`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   買家：待出貨
===================== */
app.get("/api/buyer/pending", async (req, res) => {
  try {
    res.json(await getBuyerPendingOrders(req.query.userId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
