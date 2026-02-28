import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import sheetService from "./services/sheetService.js";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- 商品管理 API ---
app.get("/api/products", async (req, res) => {
  try {
    const products = await sheetService.getProducts();
    res.json(products || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/products", async (req, res) => {
  try {
    await sheetService.appendProduct(req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 新增：修正商品 API
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

// --- 訂單管理 API ---
app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await sheetService.getOrders();
    res.json(orders || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 伺服器運行於: ${PORT}`));