import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import productService from "./services/productService.js";
import orderService from "./services/orderService.js";
import shippingService from "./services/shippingService.js";
import arrivalService from "./services/arrivelService.js";
import pdfService from "./services/pdfService.js";
import vendorService from "./services/vendorService.js";

const app = express();
app.use(express.json());

// 全域 Debug Log：只要有任何請求進來，Render Logs 必須印出這行
app.use((req, res, next) => {
  console.log(`📡 收到請求: ${req.method} ${req.url} | ID: ${req.header("x-liff-user-id")}`);
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/pdf", express.static(path.join(__dirname, "public/pdf")));

// 極簡化驗證：完全不擋人，只負責把 ID 傳下去
const adminAuth = (req, res, next) => {
  req.adminUserId = req.header("x-liff-user-id") || "UNKNOWN";
  next();
};

/* ===== API 路由 ===== */

// 確保路徑完全對應前端 fetch('/api/admin/orders')
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  try {
    const data = await orderService.getAllOrders();
    res.json(data || []);
  } catch (e) {
    console.error("❌ 內部錯誤:", e);
    res.status(500).json({ error: e.message });
  }
});

// 其餘管理路由 (路徑簡化處理)
app.get("/api/admin/arrival-list", adminAuth, async (req, res) => {
  try { res.json(await arrivalService.getArrivalList()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/products/create", adminAuth, async (req, res) => {
  try { res.json({ ok: true, result: await productService.createProduct(req.body) }); } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 伺服器已啟動於通訊埠 ${PORT}`));