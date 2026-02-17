import express from "express";
import path from "path";
import { fileURLToPath } from "url";

/* ===== ESM dirname support ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===== Routes ===== */
import adminRoutes from "./routes/adminRoutes.js";
import adminArrivalRoutes from "./routes/adminArrival.js";
import adminShippingRoutes from "./routes/adminShipping.js";
import adminProductRoutes from "./routes/adminproduct.js"; 
import adminOverstockRoutes from "./routes/adminOverstock.js";
import adminOverstockStatsRoutes from "./routes/adminOverstockStats.js";
import buyerOrderRoutes from "./routes/buyerOrder.js";

/* ===== Services ===== */
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

import { generateShippingPdf } from "./services/pdfService.js";
import { generateBuyerPackingPdf } from "./services/buyerPackingPdfService.js";

const app = express();
app.use(express.json());

/* =====================
   靜態資料夾與 LIFF 路徑
===================== */
app.use(express.static(path.join(__dirname, "public")));
app.use("/liff", express.static(path.join(__dirname, "public/liff")));
app.use("/pdf", express.static(path.join(__dirname, "public/pdf")));

/* =====================
   Webhook：精準抓取 ID
===================== */
app.post("/webhook", (req, res) => {
  const events = req.body.events;
  if (events && events.length > 0) {
    events.forEach(event => {
      const source = event.source;
      const msg = event.message;

      console.log("-----------------------------------------");
      console.log(`📅 Time: ${new Date().toLocaleString("zh-TW", {timeZone: "Asia/Taipei"})}`);
      
      // 偵測來源類型
      if (source.type === "group") {
        console.log(`📍 [GROUP EVENT]`);
        console.log(`🆔 GroupID: ${source.groupId}`);
        console.log(`👤 UserID:  ${source.userId || "Unknown (User must follow Bot)"}`);
      } else if (source.type === "user") {
        console.log(`📍 [PERSONAL EVENT]`);
        console.log(`👤 UserID:  ${source.userId}`);
      }

      if (msg?.type === "text") {
        console.log(`💬 Message: ${msg.text}`);
      }
      console.log("-----------------------------------------");
    });
  }
  res.sendStatus(200);
});

/* =====================
   管理員 API
===================== */
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminArrivalRoutes);
app.use("/api/admin", adminShippingRoutes);
app.use("/api/admin", adminProductRoutes);
app.use("/api/admin/overstock", adminOverstockRoutes);
app.use("/api/admin/overstock", adminOverstockStatsRoutes);

/* =====================
   買家 API
===================== */
app.use("/api/buyer", buyerOrderRoutes);

/* =====================
   商品管理 API
===================== */

/* 取得所有商品 */
app.get("/api/products", async (req, res) => {
  try {
    const data = await getProducts();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* 商品詳細 */
app.get("/api/product-detail/:code", async (req, res) => {
  try {
    const list = await getProducts();
    const product = list.find(p => p.productCode === req.params.code);
    if (!product) return res.status(404).json({ error: "找不到商品" });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* 上下架 */
app.post("/api/product/active", async (req, res) => {
  try {
    const { productCode, active } = req.body;
    await updateProductStatus(productCode, active);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* 結單 */
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
   買家訂單 API
===================== */
app.get("/api/buyer/orders", async (req, res) => {
  try {
    res.json(await getBuyerOrders(req.query.userId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/buyer/pending", async (req, res) => {
  try {
    res.json(await getBuyerPendingOrders(req.query.userId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   出貨 API
===================== */
app.get("/api/admin/shipping-list", async (req, res) => {
  try {
    res.json(await getShippingList());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/ship", async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds?.length) return res.status(400).json({ error: "未選擇出貨項目" });

    const shippedData = await markOrdersShipped(orderIds);
    const pdfPath = await generateShippingPdf(shippedData);

    res.json({
      ok: true,
      pdfUrl: `/pdf/${path.basename(pdfPath)}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* 買家打包 PDF */
app.get("/api/admin/buyer-packing-pdf", async (req, res) => {
  try {
    const list = await getBuyerPackingList();
    if (!list || Object.keys(list).length === 0) return res.status(400).json({ error: "無資料" });

    const pdfPath = await generateBuyerPackingPdf(list);
    res.json({
      ok: true,
      pdfUrl: `/pdf/${path.basename(pdfPath)}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* 結單提醒 */
app.get("/api/admin/close-reminder", async (req, res) => {
  try {
    const products = await getProductsClosingTomorrow();
    if (!products.length) return res.json({ text: "明日無結單商品" });

    const list = products.map((p, i) => `${i + 1}. ${p.productName}`).join("\n");
    res.json({ text: `⚠️【結單提醒】\n\n${list}\n\n請盡速下單` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use((req, res) => {
  res.status(404).send("404 Not Found - 請確認路徑是否正確");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});