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

// --- LIFF 頁面導向路由 ---
app.get('/liff/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'liff', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("找不到頁面檔案");
    });
});

// --- [A] 訂單相關 API ---

// 1. 取得訂單
app.get("/api/admin/orders", async (req, res) => {
    try {
        const { userId } = req.query; 
        const orders = await sheetService.getOrders(userId);
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. 確認結單：更改 Orders 狀態並彙整至 VendorOrders
app.post("/api/admin/orders/:orderId/finalize", async (req, res) => {
    try {
        const { orderId } = req.params;
        const orders = await sheetService.getOrders();
        const target = orders.find(o => String(o.orderId) === String(orderId));
        if (!target) return res.status(404).json({ error: "找不到訂單" });

        // A. 更新買家訂單狀態
        await sheetService.updateOrderWithCheck(orderId, { status: '已結單' });

        // B. 自動彙整至廠商採購表
        await sheetService.syncToVendorOrders({
            productCode: target.productCode,
            productName: target.productName,
            spec: target.spec,
            qty: target.qty
        });

        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- [B] 廠商管理 API (VendorOrders) ---

// 1. 取得廠商採購清單
app.get("/api/admin/vendor-orders", async (req, res) => {
    try {
        const data = await sheetService.getVendorOrders();
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. 更新採購資料 (下訂、匯款、成本、廠商名稱)
app.put("/api/admin/vendor-orders/update", async (req, res) => {
    try {
        await sheetService.updateVendorOrder(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. 廠商端斷貨處理
app.post("/api/admin/vendor-orders/out-of-stock", async (req, res) => {
    const { productCode, productName, spec } = req.body;
    try {
        // 更新廠商表狀態
        await sheetService.updateVendorStatus(productCode, spec, '斷貨');
        
        // 取得所有訂購此規格的買家
        const orders = await sheetService.getOrders();
        const affectedBuyers = orders.filter(o => o.productCode === productCode && o.spec === spec && o.status !== '買家取消');

        // 群發通知
        await Promise.all(affectedBuyers.map(async (b) => {
            if (b.buyerId) {
                try {
                    await client.pushMessage(b.buyerId, {
                        type: 'text',
                        text: `【斷貨通知】\n您訂購的「${productName} (${spec})」因廠商供貨中斷，系統已自動取消該筆訂購，深感抱歉。`
                    });
                } catch (err) { console.error("通知失敗:", b.buyerId); }
            }
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 管理系統運行中，端口: ${PORT}`));