import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import sheetService from "./services/sheetService.js";
import { client } from "./services/lineService.js"; // 確保你有這個 service 用於推播

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

// ❌ 斷貨處理：更新狀態 + LINE 通知買家
app.post('/api/admin/products/out-of-stock', async (req, res) => {
  const { productCode, productName } = req.body;
  try {
    const affectedBuyers = await sheetService.getBuyersByProduct(productCode);
    await sheetService.updateProductStatus(productCode, '斷貨');
    
    // 執行 LINE 推播通知
    await Promise.all(affectedBuyers.map(async (buyer) => {
      try {
        await client.pushMessage(buyer.lineId, {
          type: 'text',
          text: `【斷貨通知】\n很抱歉，您訂購的「${productName}」因廠商斷貨已自動取消訂單。造成不便敬請見諒。`
        });
      } catch (e) { console.error("LINE 通知失敗:", e); }
    }));
    
    res.json({ message: `已標記斷貨並通知 ${affectedBuyers.length} 位買家` });
  } catch (e) { res.status(500).send(e.message); }
});

// --- 訂單與到貨管理 API ---
app.get("/api/admin/orders", async (req, res) => {
  try { res.json(await sheetService.getOrders()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新訂單狀態 (支援拆單)
app.put("/api/admin/orders/:id/status", async (req, res) => {
  try {
    await sheetService.updateOrderAndSplit(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));