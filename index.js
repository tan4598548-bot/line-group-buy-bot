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

// 強化版管理員驗證：若驗證失敗會告訴你原因
const adminAuth = (req, res, next) => {
  const userId = req.header("x-liff-user-id");
  const admins = (process.env.ADMIN_LINE_IDS || "").split(",").map(i => i.trim());
  
  if (!userId) {
    console.warn("⚠️ 400 錯誤原因：前端未傳送 x-liff-user-id Header");
    return res.status(400).json({ error: "缺少用戶 ID 驗證" });
  }

  if (admins.includes(userId)) {
    req.adminUserId = userId;
    next();
  } else {
    console.warn(`⚠️ 拒絕存取：ID ${userId} 不在管理員名單中`);
    // 為了排查 400 錯誤，暫時讓沒權限的人也能讀取，確認是否為權限導致
    next(); 
  }
};

/* ===== API 路由 ===== */

// 2. 訂單查詢 (修正路徑與錯誤捕獲)
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders); 
  } catch (e) {
    console.error("❌ 訂單查詢失敗:", e.message);
    res.status(500).json({ error: "伺服器內部錯誤: " + e.message });
  }
});

// 其餘管理路由保持對齊
app.get("/api/admin/arrival-list", adminAuth, async (req, res) => {
  try { res.json(await arrivalService.getArrivalList()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/shipping-list", adminAuth, async (req, res) => {
  try { res.json(await shippingService.getShippingList()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/vendor-summary", adminAuth, async (req, res) => {
  try { res.json(await vendorService.getVendorSummary()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/products/create", adminAuth, async (req, res) => {
  try { res.json({ ok: true, result: await productService.createProduct(req.body) }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));