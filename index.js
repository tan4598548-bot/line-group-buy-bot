import express from "express";
import bodyParser from "body-parser";
import { getProducts, setProductActive, closeProduct } from "./services/sheetService.js";
import { getBuyerOrders } from "./services/orderService.js";

const app = express();
app.use(bodyParser.json());

/* =====================
   商品清單（LIFF）
===================== */
app.get("/api/products", async (req, res) => {
  const data = await getProducts();
  res.json(data);
});

/* =====================
   商品上下架
===================== */
app.post("/api/product/active", async (req, res) => {
  const { productCode, active } = req.body;
  await setProductActive(productCode, active);
  res.json({ ok: true });
});

/* =====================
   商品結單
===================== */
app.post("/api/product/close", async (req, res) => {
  const { productCode } = req.body;
  await closeProduct(productCode);
  res.json({ ok: true });
});

/* =====================
   買家 LIFF 查詢
===================== */
app.get("/api/buyer/orders", async (req, res) => {
  const { userId } = req.query;
  const data = await getBuyerOrders(userId);
  res.json(data);
});

/* =====================
   啟動
===================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
