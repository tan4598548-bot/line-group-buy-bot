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
app.use(express.static(path.join(__dirname, "public")));

// --- LIFF 頁面路由 ---
app.get('/liff/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'liff', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("找不到頁面檔案");
    });
});

// --- 商品 API ---
app.get("/api/products", async (req, res) => {
    try {
        const products = await sheetService.getProducts(req.query.filter);
        res.json(products);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/products", async (req, res) => {
    try {
        const code = await sheetService.appendProduct(req.body);
        res.json({ code, ok: true });
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

// --- 訂單 API (含買家過濾與安全檢查) ---
app.get("/api/admin/orders", async (req, res) => {
    try {
        const { userId } = req.query;
        const orders = await sheetService.getOrders(userId);
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/orders", async (req, res) => {
    try {
        await sheetService.appendOrder(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 💡 修改/取消訂單：這理會調用 checkLock 邏輯
app.put("/api/admin/orders/:orderId/status", async (req, res) => {
    try {
        await sheetService.updateOrderWithCheck(req.params.orderId, req.body);
        res.json({ ok: true });
    } catch (e) {
        const status = e.message.includes("已結單") ? 403 : 500;
        res.status(status).json({ error: e.message });
    }
});

// --- 斷貨與推播 ---
app.post('/api/admin/products/out-of-stock', async (req, res) => {
    const { productCode, productName } = req.body;
    try {
        const buyers = await sheetService.getBuyersByProduct(productCode);
        await sheetService.updateProductStatus(productCode, '斷貨');
        
        await Promise.all(buyers.map(async (b) => {
            try {
                await client.pushMessage(b.lineId, `【斷貨通知】\n商品「${productName}」因故斷貨，系統已自動取消您的訂單。`);
            } catch (err) { console.error(`推播失敗: ${b.lineId}`); }
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));