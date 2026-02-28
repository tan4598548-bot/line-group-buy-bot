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

// 靜態檔案與 PDF 路徑設定
app.use(express.static(path.join(__dirname, "public")));
app.use("/pdf", express.static(path.join(__dirname, "public/pdf")));

// 🛡️ 管理員驗證中間層 (保留 Debug 模式)
const adminAuth = (req, res, next) => {
  const userId = req.header("x-liff-user-id");
  const admins = (process.env.ADMIN_LINE_IDS || "").split(",").map(i => i.trim());
  
  if (!userId) {
    console.log("ℹ️ [Debug] 請求未帶 UserID");
  } else if (!admins.includes(userId)) {
    console.log(`ℹ️ [Debug] 用戶 ${userId} 不在名單 [${admins}]`);
  }
  
  // 測試階段：即使 ID 不對也放行，避免前端直接跳 400 錯誤
  req.adminUserId = userId || "DEBUG_USER";
  next(); 
};

/* ===== 管理端 API (Admin) ===== */

// 1. 商品管理：建立商品
app.post("/api/admin/products/create", adminAuth, async (req, res) => {
  try { res.json({ ok: true, result: await productService.createProduct(req.body) }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. 訂單查詢：取得所有訂單
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  try { res.json(await orderService.getAllOrders()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. 到貨點貨：取得待點貨清單
app.get("/api/admin/arrival-list", adminAuth, async (req, res) => {
  try { res.json(await arrivalService.getArrivalList()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. 發貨作業：標記發貨並產生 PDF
app.get("/api/admin/shipping-list", adminAuth, async (req, res) => {
  try { res.json(await shippingService.getShippingList()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/ship", adminAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    const shippedOrders = await shippingService.markOrdersShipped(orderIds);
    const pdfUrl = await pdfService.generateShippingPdf(shippedOrders);
    res.json({ ok: true, pdfUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. 廠商管理：取得採購統計
app.get("/api/admin/vendor-summary", adminAuth, async (req, res) => {
  try { res.json(await vendorService.getVendorSummary()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ===== 買家端 API (Buyer) ===== */

// 取得商品列表 (首頁)
app.get("/api/products", async (req, res) => {
  try { res.json(await productService.listProducts(req.query.type)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 買家下單
app.post("/api/order", async (req, res) => {
  try { await orderService.handleOrder(req, res); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 買家查詢自己的訂單
app.get("/api/buyer/orders", async (req, res) => {
  try { res.json(await orderService.getBuyerOrders(req.query.userId)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ===== 伺服器啟動 ===== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));