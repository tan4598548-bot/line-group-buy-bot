import express from "express"; // 👈 確保這行存在，否則會報 express is not defined
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 導入服務模組
import productService from "./services/productService.js";
import orderService from "./services/orderService.js";
import shippingService from "./services/shippingService.js";
import arrivalService from "./services/arrivelService.js";
import pdfService from "./services/pdfService.js";
import vendorService from "./services/vendorService.js";

const app = express();
app.use(express.json());

// 靜態檔案路徑對齊 (對應 public/liff 目錄)
app.use(express.static(path.join(__dirname, "public")));
app.use("/liff", express.static(path.join(__dirname, "public/liff")));

// Debug 中間層：追蹤為什麼 ID 會是 undefined
app.use((req, res, next) => {
  const userId = req.header("x-liff-user-id");
  if (req.url.startsWith("/api")) {
    console.log(`📡 [API Request] ${req.method} ${req.url} | Header ID: ${userId || "MISSING"}`);
  }
  next();
});

/* ===== 管理端 API ===== */

// 2. 訂單查詢
app.get("/api/admin/orders", async (req, res) => {
  const userId = req.header("x-liff-user-id");
  
  // 嚴格檢查：如果前端傳來 "undefined" 字串也視為無效
  if (!userId || userId === "undefined") {
    console.error("❌ 拒絕請求：未收到有效的 User ID");
    return res.status(400).json({ error: "前端未正確傳送 LINE ID" });
  }

  try {
    const data = await orderService.getAllOrders();
    res.json(data || []);
  } catch (e) {
    console.error("❌ Orders API Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 其他路由補齊
app.get("/api/admin/arrival-list", (req, res) => arrivalService.getArrivalList().then(d => res.json(d)));
app.post("/api/admin/products/create", (req, res) => productService.createProduct(req.body).then(d => res.json(d)));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});