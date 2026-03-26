import 'dotenv/config';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import productRoutes from "./routes/productRoutes.js";
import { sheetService } from "./services/sheetService.js";
import { client } from "./services/lineClient.js";
import pdfService from "./services/pdfService.js";

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

// --- [A] 買家與管理端訂單 API ---

app.get("/api/admin/orders", async (req, res) => {
    try {
        const { userId } = req.query; 
        const orders = await sheetService.getOrders(userId);
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 核心：確認結單（同步至 VendorOrders）
app.post("/api/admin/orders/:orderId/finalize", async (req, res) => {
    try {
        const { orderId } = req.params;
        const orders = await sheetService.getOrders();
        const target = orders.find(o => String(o.orderId) === String(orderId));
        if (!target) return res.status(404).json({ error: "找不到訂單" });

        await sheetService.updateOrderWithCheck(orderId, { status: '已結單' });
        await sheetService.syncToVendorOrders({
            productCode: target.productCode,
            productName: target.productName,
            spec: target.spec,
            qty: target.qty
        });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- [B] 廠商採購管理 API ---

app.get("/api/admin/vendor-orders", async (req, res) => {
    try {
        const data = await sheetService.getVendorOrders();
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/admin/vendor-orders/update", async (req, res) => {
    try {
        await sheetService.updateVendorOrder(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 到貨點貨
app.put("/api/admin/vendor-orders/arrival", async (req, res) => {
    try {
        const { productCode, spec, arrivedQty } = req.body;
        await sheetService.updateArrivalStatus(productCode, spec, arrivedQty);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- [C] 發貨與 PDF API ---

app.get("/api/admin/shipping/export-pdf", async (req, res) => {
    try {
        const { productCode, spec } = req.query;
        const allOrders = await sheetService.getOrders();
        const shippingList = allOrders.filter(o => 
            o.productCode === productCode && o.spec === spec && 
            (o.status === '已結單' || o.status === '待點貨')
        );

        if (shippingList.length === 0) return res.status(404).json({ error: "無可發貨訂單" });
        const pdfUrl = await pdfService.generateShippingPdf(shippingList);
        res.json({ url: pdfUrl }); 
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/shipping/mark-done", async (req, res) => {
    try {
        const { productCode, spec } = req.body;
        const allOrders = await sheetService.getOrders();
        const targets = allOrders.filter(o => o.productCode === productCode && o.spec === spec);
        await Promise.all(targets.map(o => sheetService.updateOrderWithCheck(o.orderId, { status: '已到貨' })));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 全功能系統運行中，端口: ${PORT}`));