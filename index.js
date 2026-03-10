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

// 1. LIFF 靜態檔案路由 (確保買家能讀取 HTML)
app.get('/liff/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'liff', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("找不到頁面檔案");
    });
});

app.use(express.static(path.join(__dirname, "public")));

// --- 商品 API ---
// 取得清單
app.get("/api/products", async (req, res) => {
    try {
        const products = await sheetService.getProducts(req.query.filter);
        res.json(products);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 新增商品
app.post("/api/products", async (req, res) => {
    try {
        const code = await sheetService.appendProduct(req.body);
        res.json({ code, ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 修正商品資訊
app.put("/api/products/:code", async (req, res) => {
    try {
        await sheetService.updateProduct(req.params.code, req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 刪除商品 (標記為下架/刪除)
app.delete("/api/products/:code", async (req, res) => {
    try {
        await sheetService.deleteProduct(req.params.code);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 訂單 API ---
// 取得所有訂單 (買家端與團主端通用)
app.get("/api/admin/orders", async (req, res) => {
    try {
        const orders = await sheetService.getOrders();
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 新增訂單
app.post("/api/admin/orders", async (req, res) => {
    try {
        await sheetService.appendOrder(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 💡 關鍵：更新訂單狀態、數量、總額 (買家刪單或改單都靠這裡)
app.put("/api/admin/orders/:orderId/status", async (req, res) => {
    try {
        // req.body 會包含 { qty, total, status }
        await sheetService.updateOrderAndSplit(req.params.orderId, req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 斷貨處理 (含 LINE 推播)
app.post('/api/admin/products/out-of-stock', async (req, res) => {
    const { productCode, productName } = req.body;
    try {
        const buyers = await sheetService.getBuyersByProduct(productCode);
        await sheetService.updateProductStatus(productCode, '斷貨');
        
        // 推播給所有買過該商品的買家
        await Promise.all(buyers.map(async (b) => {
            try {
                await client.pushMessage(b.lineId, {
                    type: 'text',
                    text: `【斷貨通知】\n商品「${productName}」因故斷貨，系統已自動取消您的訂單。造成不便請見諒。`
                });
            } catch (e) { console.error(`無法推播給 ${b.lineId}:`, e.message); }
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));