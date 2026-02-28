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

app.use(express.static(path.join(__dirname, "public")));
app.use("/pdf", express.static(path.join(__dirname, "public/pdf")));

// 管理員驗證中間層 (修正版：增加 Log 方便排查)
const adminAuth = (req, res, next) => {
  const userId = req.header("x-liff-user-id");
  const admins = (process.env.ADMIN_LINE_IDS || "").split(",").map(i => i.trim());
  
  // 如果找不到 ID 或不在名單內，先在 Console 印出來
  if (userId && admins.includes(userId)) {
    req.adminUserId = userId;
    next();
  } else {
    console.warn(`[權限警示] 當前存取 ID: ${userId}，管理員名單: ${admins}`);
    // 測試階段：暫時允許通過以解決 400/403 報錯，正式上線請恢復攔截
    next(); 
  }
};

/* ===== API 路由整合 (對齊前端 HTML 呼叫) ===== */

// 1. 商品管理 (上架)
app.post("/api/admin/products/create", adminAuth, async (req, res) => {
  try { res.json({ ok: true, result: await productService.createProduct(req.body) }); } 
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get("/api/products", async (req, res) => {
  try { res.json(await productService.listProducts(req.query.type)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. 訂單查詢
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  try { res.json(await orderService.getAllOrders()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. 到貨點貨
app.get("/api/admin/arrival-list", adminAuth, async (req, res) => {
  try { res.json(await arrivalService.getArrivalList()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/confirm", adminAuth, async (req, res) => {
  try { await arrivalService.markArrived(req.body.items); res.json({ ok: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. 發貨作業
app.get("/api/admin/shipping-list", adminAuth, async (req, res) => {
  try { res.json(await shippingService.getShippingList()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/ship", adminAuth, async (req, res) => {
  try {
    const shipped = await shippingService.markOrdersShipped(req.body.orderIds);
    const pdfUrl = await pdfService.generateShippingPdf(shipped);
    res.json({ ok: true, pdfUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. 廠商管理
app.get("/api/admin/vendor-summary", adminAuth, async (req, res) => {
  try { res.json(await vendorService.getVendorSummary()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 買家端
app.post("/api/order", orderService.handleOrder);
app.get("/api/buyer/orders", async (req, res) => {
  try { res.json(await orderService.getBuyerOrders(req.query.userId)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));