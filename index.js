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

const adminAuth = (req, res, next) => {
  const userId = req.header("x-liff-user-id");
  const admins = (process.env.ADMIN_LINE_IDS || "").split(",").map(i => i.trim());
  
  if (userId && admins.includes(userId)) {
    req.adminUserId = userId;
    next();
  } else {
    console.warn(`拒絕未授權存取: ${userId}`);
    res.status(403).json({ ok: false, error: "您無管理員權限，請確認您的 LINE ID 已加入 ADMIN_LINE_IDS" });
  }
};

/* ===== API 路由 ===== */
app.get("/api/products", async (req, res) => {
  try { res.json(await productService.listProducts(req.query.type)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/products/create", adminAuth, async (req, res) => {
  try { res.json({ ok: true, result: await productService.createProduct(req.body) }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/order", orderService.handleOrder);
app.get("/api/buyer/orders", async (req, res) => {
  try { res.json(await orderService.getBuyerOrders(req.query.userId)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/arrival-list", adminAuth, async (req, res) => {
  try { res.json(await arrivalService.getArrivalList()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/confirm", adminAuth, async (req, res) => {
  try { await arrivalService.markArrived(req.body.items); res.json({ ok: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

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

app.get("/api/admin/vendor/order-pdf", adminAuth, async (req, res) => {
  try { res.json({ ok: true, pdfUrl: await vendorService.generateVendorOrderPdf() }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));