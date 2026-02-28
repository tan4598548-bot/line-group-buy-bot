import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import productService from "./services/productService.js";
import orderService from "./services/orderService.js";
import sheetService from "./services/sheetService.js";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- 商品管理 API ---
app.get("/api/products", async (req, res) => {
  try {
    const products = await sheetService.getProducts();
    res.json(products || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 正確呼叫刪除邏輯
app.delete("/api/products/:code", async (req, res) => {
  try {
    console.log(`🗑️ 正在刪除商品: ${req.params.code}`);
    await sheetService.deleteProduct(req.params.code);
    res.json({ ok: true });
  } catch (e) {
    console.error("刪除 API 出錯:", e);
    res.status(500).json({ error: e.message });
  }
});

// 新增商品 API
app.post("/api/products", async (req, res) => {
  try {
    await sheetService.appendProduct(req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 訂單與 PDF API ---
app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await sheetService.getOrders();
    res.json(orders || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/generate-shipping-pdf", async (req, res) => {
  try {
    const { orderIds } = req.body;
    res.json({ ok: true, downloadUrl: `/api/admin/download-mock-pdf?ids=${orderIds.join(",")}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/download-mock-pdf", (req, res) => {
  res.send(`<h1>📄 發貨小紙張 (模擬)</h1><p>訂單: ${req.query.ids}</p><button onclick="window.print()">列印</button>`);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 伺服器已啟動: ${PORT}`));