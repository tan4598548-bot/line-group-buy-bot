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

// 1. LIFF 檔案路由
app.get('/liff/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'liff', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("找不到頁面檔案");
    });
});

app.use(express.static(path.join(__dirname, "public")));

// --- 商品 API ---
app.get("/api/products", async (req, res) => res.json(await sheetService.getProducts(req.query.filter)));

app.post("/api/products", async (req, res) => {
    try {
        const code = await sheetService.appendProduct(req.body);
        res.json({ code });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 訂單 API ---

// 取得所有訂單
app.get("/api/admin/orders", async (req, res) => {
    try {
        const orders = await sheetService.getOrders();
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 買家下單
app.post("/api/admin/orders", async (req, res) => {
    try {
        await sheetService.appendOrder(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 關鍵：買家修改訂單 (數量/狀態)
app.put("/api/admin/orders/:orderId/status", async (req, res) => {
    try {
        const { orderId } = req.params;
        const updateData = req.body;
        await sheetService.updateOrderAndSplit(orderId, updateData);
        res.json({ ok: true });
    } catch (e) { 
        console.error("更新訂單出錯:", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// 斷貨處理
app.post('/api/admin/products/out-of-stock', async (req, res) => {
    const { productCode, productName } = req.body;
    try {
        const buyers = await sheetService.getBuyersByProduct(productCode);
        await sheetService.updateProductStatus(productCode, '斷貨');
        await Promise.all(buyers.map(async (b) => {
            try {
                await client.pushMessage(b.lineId, {
                    type: 'text',
                    text: `【斷貨通知】\n商品「${productName}」因故斷貨，系統已自動取消您的訂單。`
                });
            } catch (e) {}
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));