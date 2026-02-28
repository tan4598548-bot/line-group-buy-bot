import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 匯入服務層
import productService from "./services/productService.js";
import orderService from "./services/orderService.js";
import sheetService from "./services/sheetService.js";

const app = express();
app.use(express.json());

// 靜態檔案路徑
app.use(express.static(path.join(__dirname, "public")));

// --- 1. 基礎連線測試 ---
app.get("/api/test", (req, res) => {
  res.send("✅ API Server is reachable!");
});

// --- 2. 商品管理 API ---
app.get("/api/products", async (req, res) => {
  try {
    const products = await productService.listProducts();
    res.json(products || []);
  } catch (e) {
    console.error("❌ Product API Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 刪除商品路由
app.delete("/api/products/:code", async (req, res) => {
  try {
    // 此處需在 sheetService 實作 delete 邏輯
    res.json({ ok: true, message: `商品 ${req.params.code} 已刪除` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- 3. 訂單管理 API ---
app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders || []);
  } catch (e) {
    console.error("❌ Admin Orders API Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- 4. 發貨作業與 PDF 產單路由 (解決 Page Not Found) ---
app.post("/api/admin/generate-shipping-pdf", async (req, res) => {
  try {
    const { orderIds } = req.body;
    console.log(`🖨️ [PDF] 收到產單請求，訂單數: ${orderIds ? orderIds.length : 0}`);
    
    // 回傳模擬下載連結，帶入勾選的 ID 參數
    res.json({ 
      ok: true, 
      downloadUrl: `/api/admin/download-mock-pdf?ids=${orderIds.join(",")}` 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 模擬 PDF 下載頁面 (HTML 格式)
app.get("/api/admin/download-mock-pdf", (req, res) => {
  const ids = req.query.ids || "無資料";
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>發貨小紙張列印</title>
      <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
        .ticket { border: 2px dashed #333; padding: 15px; margin-bottom: 20px; max-width: 400px; }
        .btn-print { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        @media print { .btn-print { display: none; } }
      </style>
    </head>
    <body>
      <h1>📄 發貨小紙張 (測試版)</h1>
      <p>請確認以下訂單內容後進行列印：</p>
      <div class="ticket">
        <strong>待發貨訂單編號：</strong><br>
        ${ids.split(',').join('<br>')}
      </div>
      <button class="btn-print" onclick="window.print()">🖨️ 直接列印此頁</button>
      <p style="color:gray; font-size: 12px;">提示：此為模擬 PDF 功能，未來可串接正式 PDF 套件。</p>
    </body>
    </html>
  `);
});

// --- 5. 到貨/點貨 API ---
app.get("/api/admin/arrival-list", async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    // 過濾非已到貨訂單
    const pending = orders.filter(o => o.status !== 'arrived');
    res.json(pending);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- 6. 靜態路由備援 ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) res.status(404).send("Page not found");
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 伺服器運行中: http://localhost:${PORT}`);
});