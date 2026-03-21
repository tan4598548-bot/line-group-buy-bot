import 'dotenv/config';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import productRoutes from "./routes/productRoutes.js";
import { sheetService } from "./services/sheetService.js";
import { client } from "./services/lineClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- 路由掛載 ---
app.use('/api', productRoutes); 

// --- LIFF 頁面路由 ---
app.get('/liff/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'liff', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("找不到頁面檔案");
    });
});

// --- 訂單 API (含買家過濾與安全檢查) ---
app.get("/api/admin/orders", async (req, res) => {
    try {
        const { userId } = req.query; // 支援買家過濾
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

// 修改/取消訂單：包含結單鎖定 checkLock 邏輯
app.put("/api/admin/orders/:orderId/status", async (req, res) => {
    try {
        await sheetService.updateOrderWithCheck(req.params.orderId, req.body);
        res.json({ ok: true });
    } catch (e) {
        const status = e.message.includes("已結單") ? 403 : 500;
        res.status(status).json({ error: e.message });
    }
});

// --- 斷貨與推播 (保留原始功能) ---
app.post('/api/admin/products/out-of-stock', async (req, res) => {
    const { productCode, productName } = req.body;
    try {
        // 從 sheetService 獲取購買該商品的買家清單
        const buyers = await sheetService.getBuyersByProduct(productCode);
        // 更新商品狀態為斷貨
        await sheetService.updateProductStatus(productCode, '斷貨');
        
        // 批次執行 LINE 推播
        await Promise.all(buyers.map(async (b) => {
            try {
                if (b.lineId) {
                    await client.pushMessage(b.lineId, {
                        type: 'text',
                        text: `【斷貨通知】\n商品「${productName}」因故斷貨，系統已自動取消您的訂單。`
                    });
                }
            } catch (err) { console.error(`推播失敗: ${b.lineId}`, err); }
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));