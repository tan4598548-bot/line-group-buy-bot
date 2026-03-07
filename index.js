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

// 新增：儲存/更新單一商品 (對接 liff-admin-products.html 的 saveEdit)
app.put("/api/products/:code", async (req, res) => {
  try {
    const code = req.params.code;
    await sheetService.updateProduct(code, req.body); // 需確保 sheetService 有此方法
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 新增：刪除商品 (對接 liff-admin-products.html 的 deleteItem)
app.delete("/api/products/:code", async (req, res) => {
  try {
    await sheetService.deleteProduct(req.params.code); // 需確保 sheetService 有此方法
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// --- 訂單 API ---

// 新增：買家下單 POST (對接 product-detail.html)
app.post("/api/admin/orders", async (req, res) => {
  try {
    await sheetService.appendOrder(req.body); // 需確保 sheetService 有此方法
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/orders", async (req, res) => {
  try { res.json(await sheetService.getOrders()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 優化：更新訂單 (處理數量修改與狀態變更)
app.put("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;

    // 如果有傳入 qty，代表是買家修改數量，需要重新計算 total
    if (updateData.qty && !updateData.total) {
      const orders = await sheetService.getOrders();
      const currentOrder = orders.find(o => String(o.orderId) === String(orderId));
      if (currentOrder) {
        updateData.total = Number(currentOrder.price) * Number(updateData.qty);
      }
    }

    await sheetService.updateOrderAndSplit(orderId, updateData);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));