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

const app = express();
app.use(express.json());

// 靜態資源
app.use(express.static(path.join(__dirname, "public")));
app.use("/pdf", express.static(path.join(__dirname, "public/pdf")));

// 管理員驗證中間件
const adminAuth = (req, res, next) => {
  const userId = req.header("x-liff-user-id");
  const admins = (process.env.ADMIN_LINE_IDS || "").split(",").map(i => i.trim());
  
  if (userId && admins.includes(userId)) {
    req.adminUserId = userId;
    next();
  } else {
    res.status(403).json({ ok: false, error: "Admin only" });
  }
};

/* ===== 商品 API ===== */
app.get("/api/products", async (req, res) => {
  try {
    const data = await productService.listProducts(req.query.type);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/products/create", adminAuth, async (req, res) => {
  try {
    const result = await productService.createProduct(req.body);
    res.json({ ok: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ===== 訂單 API ===== */
app.post("/api/order", orderService.handleOrder);

app.get("/api/buyer/orders", async (req, res) => {
  res.json(await orderService.getBuyerOrders(req.query.userId));
});

/* ===== 到貨 API ===== */
app.get("/api/admin/arrival-list", adminAuth, async (req, res) => {
  res.json(await arrivalService.getArrivalList());
});

app.post("/api/admin/confirm", adminAuth, async (req, res) => {
  await arrivalService.markArrived(req.body.items);
  res.json({ ok: true });
});

/* ===== 出貨 API ===== */
app.get("/api/admin/shipping-list", adminAuth, async (req, res) => {
  res.json(await shippingService.getShippingList());
});

app.post("/api/admin/ship", adminAuth, async (req, res) => {
  const shipped = await shippingService.markOrdersShipped(req.body.orderIds);
  const pdfUrl = await pdfService.generateShippingPdf(shipped);
  res.json({ ok: true, pdfUrl });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));