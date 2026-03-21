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
// 靜態檔案路徑：包含 public 及其子目錄
app.use(express.static(path.join(__dirname, "public")));

// --- 路由掛載 ---
// 這裡包含了 /api/products 等基礎商品路由
app.use('/api', productRoutes); 

// --- LIFF 頁面導向路由 ---
app.get('/liff/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'liff', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("找不到頁面檔案，請確認檔案是否存在於 public/liff/ 目錄下");
    });
});

// --- [A] 訂單相關 API ---

// 1. 取得訂單 (支援管理員全查或買家過濾)
app.get("/api/admin/orders", async (req, res) => {
    try {
        const { userId } = req.query; 
        const orders = await sheetService.getOrders(userId);
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. 新增訂單
app.post("/api/admin/orders", async (req, res) => {
    try {
        await sheetService.appendOrder(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. 修改/取消訂單 (含結單鎖定 checkLock 邏輯)
app.put("/api/admin/orders/:orderId/status", async (req, res) => {
    try {
        await sheetService.updateOrderWithCheck(req.params.orderId, req.body);
        res.json({ ok: true });
    } catch (e) {
        const status = e.message.includes("已結單") ? 403 : 500;
        res.status(status).json({ error: e.message });
    }
});

// --- [B] 到貨與點貨 API (新增以支援 liff-admin-arrival.html) ---

app.get("/api/admin/vendor-summary", async (req, res) => {
    try {
        const orders = await sheetService.getOrders();
        // 過濾已取消訂單，僅統計有效訂單
        const activeOrders = orders.filter(o => o.status !== '買家取消' && o.status !== '已刪除');
        
        // 依商品代碼彙整採購總數
        const summaryMap = activeOrders.reduce((acc, cur) => {
            const code = cur.productCode;
            if (!acc[code]) {
                acc[code] = { 
                    productCode: code, 
                    productName: cur.productName, 
                    totalOrdered: 0, 
                    totalArrived: 0,
                    vendorStatus: '未到貨' 
                };
            }
            acc[code].totalOrdered += Number(cur.qty) || 0;
            return acc;
        }, {});

        res.json(Object.values(summaryMap));
    } catch (e) { res.status(500).json({ error: "彙整資料失敗: " + e.message }); }
});

// --- [C] 商品管理 API (對接新增商品功能) ---

app.post("/api/admin/products", async (req, res) => {
    try {
        // 調用 sheetService 將新商品寫入 Products 頁面 (A-O 欄位)
        await sheetService.appendProduct(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 斷貨與推播通知
app.post('/api/admin/products/out-of-stock', async (req, res) => {
    const { productCode, productName } = req.body;
    try {
        const buyers = await sheetService.getBuyersByProduct(productCode);
        await sheetService.updateProductStatus(productCode, '斷貨');
        
        await Promise.all(buyers.map(async (b) => {
            try {
                if (b.lineId) {
                    await client.pushMessage(b.lineId, {
                        type: 'text',
                        text: `【斷貨通知】\n商品「${productName}」因廠商供貨不足，系統已自動取消您的訂單，請多包涵。`
                    });
                }
            } catch (err) { console.error(`推播失敗: ${b.lineId}`, err); }
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 管理系統 Server 運行中，端口: ${PORT}`));