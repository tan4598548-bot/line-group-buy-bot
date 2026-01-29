import express from "express";
import fs from "fs";
import path from "path";

import { 
  getProducts, 
  updateProductStatus, 
  markProductClosed, 
  getBuyerOrders,

  // === 出貨 / 查詢 ===
  getShippingList,
  markOrdersShipped,
  getBuyerPendingOrders,

  // === 結單提醒 ===
  getProductsClosingTomorrow,

  // === 🆕 PDF 買家清單用 ===
  getBuyerPackingList
} from "./services/sheetService.js";

import { handleOrder } from "./services/orderService.js";
import { generateShippingPdf } from "./services/shippingPdfService.js";
import { generateBuyerPackingPdf } from "./services/buyerPackingPdfService.js";

const app = express();

// JSON + 靜態檔案（LIFF / PDF）
app.use(express.json());
app.use(express.static("public"));

/* =====================
   商品清單（LIFF）
===================== */
app.get("/api/products", async (req, res) => {
  try {
    const data = await getProducts();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================
   商品上下架（管理）
===================== */
app.post("/api/product/active", async (req, res) => {
  try {
    const { productCode, active } = req.body;
    await updateProductStatus(productCode, active);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* =====================
   商品結單（管理）
===================== */
app.post("/api/product/close", async (req, res) => {
  try {
    const { productCode } = req.body;
    await markProductClosed(productCode);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* =====================
   買家訂單查詢
===================== */
app.get("/api/buyer/orders", async (req, res) => {
  try {
    const { userId } = req.query;
    const data = await getBuyerOrders(userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================================================
   1️⃣ 管理員 LIFF：出貨清單（勾選）
===================================================== */
app.get("/api/admin/shipping-list", async (req, res) => {
  try {
    const list = await getShippingList();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================================================
   1️⃣ 管理員：標記出貨 → 產出貨 PDF
===================================================== */
app.post("/api/admin/ship", async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !orderIds.length) {
      return res.status(400).json({ error: "未選擇出貨項目" });
    }

    const shippedOrders = await markOrdersShipped(orderIds);
    const pdfPath = await generateShippingPdf(shippedOrders);

    res.json({
      ok: true,
      pdfUrl: `/pdf/${path.basename(pdfPath)}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================================================
   🆕 管理員：PDF 買家清單（揀貨 / 小紙張）
   → A4 / 24 張 / 含價錢與合計
===================================================== */
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================================================
   2️⃣ 結單前一天提醒（免費）
   → 點 API 產群公告文字
===================================================== */
app.get("/api/admin/close-reminder", async (req, res) => {
  try {
    const products = await getProductsClosingTomorrow();

    if (!products.length) {
      return res.json({ text: "明日無即將結單商品" });
    }

    const list = products
      .map((p, i) => `${i + 1}. ${p.productName}`)
      .join("\n");

    const text =
`⚠️【結單提醒】
以下商品將於【明日結單】：

${list}

請至記事本查看商品資訊並完成下單
結單後將無法追加`;

    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================================================
   3️⃣ 買家 LIFF：只看「我還在等的」
===================================================== */
app.get("/api/buyer/pending", async (req, res) => {
  try {
    const { userId } = req.query;
    const data = await getBuyerPendingOrders(userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================
   Server
===================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
