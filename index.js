import 'dotenv/config'; 
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

// 1. 設定靜態檔案路徑 (這會對應到 public 資料夾)
app.use(express.static(path.join(__dirname, "public")));

// --- 商品 API 路由 ---
app.get("/api/products", async (req, res) => res.json(await sheetService.getProducts(req.query.filter)));
app.post("/api/products", async (req, res) => res.json({ code: await sheetService.appendProduct(req.body) }));
app.put("/api/products/:code", async (req, res) => { 
    await sheetService.updateProduct(req.params.code, req.body); 
    res.json({ ok: true }); 
});

// --- 斷貨通知 API ---
app.post('/api/admin/products/out-of-stock', async (req, res) => {
  const { productCode, productName } = req.body;
  try {
    const buyers = await sheetService.getBuyersByProduct(productCode);
    await sheetService.updateProductStatus(productCode, '斷貨');
    await Promise.all(buyers.map(async (b) => {
      try { 
        await client.pushMessage(b.lineId, { type: 'text', text: `【斷貨通知】\n商品「${productName}」因故斷貨，已取消訂單。` }); 
      } catch (e) { console.error("LINE 推播失敗", e); }
    }));
    res.json({ ok: true, message: `已標記斷貨並通知 ${buyers.length} 位買家` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 訂單 API ---
app.get("/api/admin/orders", async (req, res) => res.json(await sheetService.getOrders()));
app.post("/api/admin/orders", async (req, res) => {
  try { await sheetService.appendOrder(req.body); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --- 廠商 API ---
app.get("/api/admin/vendor", async (req, res) => res.json(await sheetService.getVendorData()));
app.post("/api/admin/vendor/sync/:code", async (req, res) => {
    await sheetService.syncToVendor(req.params.code);
    res.json({ ok: true });
});

// 2. 修正 Cannot GET 的關鍵：如果找不到路徑，回傳對應的 HTML (選配，確保 LIFF 運作順暢)
app.get('/liff/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'liff', req.params.filename));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));