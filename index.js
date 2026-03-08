import 'dotenv/config'; // 💡 這一行會直接完成初始化，確保後續 import 讀得到變數

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sheetService from "./services/sheetService.js";
import orderService from "./services/orderService.js";
import { client } from "./services/lineClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- 廠商管理 ---
app.get('/api/admin/vendor', async (req, res) => {
  res.json(await sheetService.getVendorData());
});
app.post('/api/admin/vendor/sync/:code', async (req, res) => {
  await sheetService.syncToVendor(req.params.code);
  res.sendStatus(200);
});

// --- 商品管理 ---
app.get("/api/products", async (req, res) => {
  res.json(await sheetService.getProducts(req.query.filter));
});
app.put("/api/products/:code", async (req, res) => {
  await sheetService.updateProduct(req.params.code, req.body);
  res.json({ ok: true });
});
app.delete("/api/products/:code", async (req, res) => {
  await sheetService.deleteProduct(req.params.code);
  res.json({ ok: true });
});
app.post("/api/products", async (req, res) => {
  await sheetService.appendProduct(req.body);
  res.json({ ok: true });
});

// 斷貨通知
app.post('/api/admin/products/out-of-stock', async (req, res) => {
  const { productCode, productName } = req.body;
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
});

// --- 訂單 API ---
app.post("/api/admin/orders", async (req, res) => {
  try {
    const result = await orderService.createOrder(req.body);
    res.json({ ok: true, data: result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get("/api/admin/orders", async (req, res) => {
  res.json(await sheetService.getOrders());
});

app.put("/api/admin/orders/:id/status", async (req, res) => {
  await orderService.updateOrder(req.params.id, req.body);
  res.json({ ok: true });
});

// 買家刪除訂單
app.delete("/api/admin/orders/:id", async (req, res) => {
  try {
    await orderService.deleteOrder(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));