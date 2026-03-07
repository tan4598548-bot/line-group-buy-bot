import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import sheetService from "./services/sheetService.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 取得廠商清單
app.get('/api/admin/vendor', async (req, res) => {
  const data = await sheetService.getVendorData();
  res.json(data);
});

// 將結單商品同步至廠商清單
app.post('/api/admin/vendor/sync/:code', async (req, res) => {
  await sheetService.syncToVendor(req.params.code);
  res.sendStatus(200);
});

// 斷貨處理 API
app.post('/api/admin/products/out-of-stock', async (req, res) => {
  const { productCode, isClosed } = req.body;
  await sheetService.handleOutOfStock(productCode, isClosed);
  // 此處建議串接 LINE Notify 通知買家
  res.sendStatus(200);
});

// --- 商品管理 API ---
app.get("/api/products", async (req, res) => {
  try { res.json(await sheetService.getProducts()); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/products", async (req, res) => {
  try { await sheetService.appendProduct(req.body); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put("/api/products/:code", async (req, res) => {
  try { await sheetService.updateProduct(req.params.code, req.body); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete("/api/products/:code", async (req, res) => {
  try { await sheetService.deleteProduct(req.params.code); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 訂單與到貨管理 API ---
app.get("/api/admin/orders", async (req, res) => {
  try { res.json(await sheetService.getOrders()); } catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新點貨狀態
app.put("/api/admin/orders/:id/status", async (req, res) => {
  try {
    await sheetService.updateOrderStatus(req.params.id, req.body.status);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 一鍵清除已到貨 (核心補全)
app.post("/api/admin/orders/clear-arrived", async (req, res) => {
  try {
    await sheetService.clearArrivedOrders();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));