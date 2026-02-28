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

// 靜態檔案路徑設定
app.use(express.static(path.join(__dirname, "public")));
app.use("/pdf", express.static(path.join(__dirname, "public/pdf")));

const adminAuth = (req, res, next) => {
  const userId = req.header("x-liff-user-id");
  const admins = (process.env.ADMIN_LINE_IDS || "").split(",").map(i => i.trim());
  if (userId && admins.includes(userId)) {
    next();
  } else {
    // 開發階段若未帶 ID 則放行測試，正式上線請取消註解下行
    next(); 
    // res.status(403).json({ error: "無權限" });
  }
};

/* ===== 管理端 API ===== */
// 2. 訂單查詢
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  try { res.json(await orderService.getAllOrders()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. 到貨清單
app.get("/api/admin/arrival-list", adminAuth, async (req, res) => {
  try { res.json(await arrivalService.getArrivalList()); } 
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

// 5. 廠商採購統計
app.get("/api/admin/vendor-summary", adminAuth, async (req, res) => {
  try { res.json(await vendorService.getVendorSummary()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));