import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import sheetService from "./services/sheetService.js";
import { client } from "./services/lineService.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- 廠商管理 API ---
app.get('/api/admin/vendor', async (req, res) => {
  const data = await sheetService.getVendorData();
  res.json(data);
});
app.post('/api/admin/vendor/sync/:code', async (req, res) => {
  await sheetService.syncToVendor(req.params.code);
  res.sendStatus(200);
});

// --- 商品管理 API ---
app.get("/api/products", async (req, res) => {
  try { res.json(await sheetService.getProducts(req.query.filter)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/products", async (req, res) => {
  try { await sheetService.appendProduct(req.body); res.json({ ok: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ❌ 斷貨通知 API
app.post('/api/admin/products/out-of-stock', async (req, res) => {
  const { productCode, productName } = req.body;
  try {
    const affectedBuyers = await sheetService.getBuyersByProduct(productCode);
    await sheetService.updateProductStatus(productCode, '斷貨');
    await Promise.all(affectedBuyers.map(async (buyer) => {
      try {
        await client.pushMessage(buyer.lineId, {
          type: 'text',
          text: `【斷貨通知】\n您的商品「${productName}」因廠商供貨問題已斷貨並取消訂單。`
        });
      } catch (e) { console.error("通知失敗", e); }
    }));
    res.json({ message: `已通知 ${affectedBuyers.length} 位買家` });
  } catch (e) { res.status(500).send(e.message); }
});

// --- 訂單與發貨 API ---
app.get("/api/admin/orders", async (req, res) => {
  try { res.json(await sheetService.getOrders()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.put("/api/admin/orders/:id/status", async (req, res) => {
  try {
    await sheetService.updateOrderAndSplit(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));