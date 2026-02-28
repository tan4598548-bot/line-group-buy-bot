import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import productService from "./services/productService.js";
import orderService from "./services/orderService.js";
import sheetService from "./services/sheetService.js";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- 1. 商品管理 API ---
app.get("/api/products", async (req, res) => {
  try {
    const products = await productService.listProducts();
    res.json(products);
  } catch (e) { res.status(500).send(e.message); }
});

// 新增：修正/刪除商品路由
app.delete("/api/products/:code", async (req, res) => {
  try {
    await sheetService.deleteProduct(req.params.code);
    res.json({ ok: true });
  } catch (e) { res.status(500).send(e.message); }
});

// --- 2. 訂單/查詢 API ---
app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders);
  } catch (e) { res.status(500).send(e.message); }
});

// --- 3. 到貨/點貨 API (解決卡在載入中)
app.get("/api/admin/arrival-list", async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    // 只過濾出狀態為 'pending' 或 'ordered' 的訂單
    const pending = orders.filter(o => o.status !== 'arrived');
    res.json(pending);
  } catch (e) { res.status(500).send(e.message); }
});

// --- 4. 發貨與 PDF 生成
app.post("/api/admin/generate-pdf", async (req, res) => {
  try {
    const { orderIds } = req.body;
    // 這裡未來串接 PDF 套件，目前先回傳模擬成功
    res.json({ ok: true, url: "/exports/shipping_labels.pdf" });
  } catch (e) { res.status(500).send(e.message); }
});

// --- 5. 廠商管理 API
app.get("/api/admin/vendor-stats", async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    // 簡易邏輯：按商品代碼統計
    const stats = orders.reduce((acc, curr) => {
      acc[curr.productCode] = (acc[curr.productCode] || 0) + Number(curr.qty);
      return acc;
    }, {});
    res.json(stats);
  } catch (e) { res.status(500).send(e.message); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 系統核心已啟動於通訊埠 ${PORT}`));