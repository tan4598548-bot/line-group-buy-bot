import 'dotenv/config'; 
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sheetService from "./services/sheetService.js";
import { client } from "./services/lineClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());

// 1. 優先處理 LIFF 檔案路由 (讓 /liff/ 也能抓到 public/liff 裡的檔案)
app.get('/liff/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'liff', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("ERR: Not Found - 找不到頁面檔案");
    });
});

// 2. 靜態檔案路徑
app.use(express.static(path.join(__dirname, "public")));

// --- 商品管理 API ---
app.get("/api/products", async (req, res) => res.json(await sheetService.getProducts(req.query.filter)));

app.post("/api/products", async (req, res) => {
    try {
        const code = await sheetService.appendProduct(req.body);
        res.json({ code });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/products/:code", async (req, res) => {
    try {
        await sheetService.updateProduct(req.params.code, req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/products/:code", async (req, res) => {
    try {
        await sheetService.deleteProduct(req.params.code);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 斷貨通知 API ---
app.post('/api/admin/products/out-of-stock', async (req, res) => {
    const { productCode, productName } = req.body;
    try {
        const buyers = await sheetService.getBuyersByProduct(productCode);
        await sheetService.updateProductStatus(productCode, '斷貨');
        await Promise.all(buyers.map(async (b) => {
            try {
                await client.pushMessage(b.lineId, `【斷貨通知】\n商品「${productName}」因故斷貨，系統已取消訂單。`);
            } catch (e) { console.error("LINE 推播失敗:", e.message); }
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 訂單管理 API (修正：補上遺失的路由) ---

// 獲取所有訂單 (後台管理用)
app.get("/api/admin/orders", async (req, res) => {
    try {
        const orders = await sheetService.getOrders();
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 買家下單 (前端 product-detail 呼叫點)
app.post("/api/admin/orders", async (req, res) => {
    try {
        // 呼叫 sheetService.appendOrder 寫入 Google Sheets
        await sheetService.appendOrder(req.body);
        res.json({ ok: true });
    } catch (e) { 
        console.error("寫入訂單失敗:", e.message);
        res.status(400).json({ error: "寫入 Google Sheets 失敗" }); 
    }
});

// 買家查看自己的訂單
app.get("/api/buyer/orders/:lineId", async (req, res) => {
    try {
        const allOrders = await sheetService.getOrders();
        const myOrders = allOrders.filter(o => o.buyerId === req.params.lineId);
        res.json(myOrders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));