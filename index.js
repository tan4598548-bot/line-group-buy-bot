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

// 1. 優先處理 LIFF 檔案路由
app.get('/liff/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'liff', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("ERR: Not Found - 找不到頁面檔案");
    });
});

// 2. 靜態檔案路徑
app.use(express.static(path.join(__dirname, "public")));

// --- 商品與訂單 API ---
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

app.post('/api/admin/products/out-of-stock', async (req, res) => {
    const { productCode, productName } = req.body;
    try {
        const buyers = await sheetService.getBuyersByProduct(productCode);
        await sheetService.updateProductStatus(productCode, '斷貨');
        await Promise.all(buyers.map(async (b) => {
            try {
                await client.pushMessage(b.lineId, `【斷貨通知】\n商品「${productName}」因故斷貨，系統已取消訂單。`);
            } catch (e) {}
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));