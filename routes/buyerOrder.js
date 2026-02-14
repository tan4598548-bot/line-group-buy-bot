import express from "express";
import { appendOrder, getProducts } from "../services/sheetService.js";

const router = express.Router();

router.post("/order", async (req, res) => {
  const {
    userId,
    productCode,
    color,
    size,
    qty
  } = req.body;

  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) return res.status(400).json({ error: "商品不存在" });
  if (p.closed === "TRUE") return res.status(400).json({ error: "商品已結單" });

  const order = {
    userId,
    productCode,
    productName: p.productName,
    color,
    size,
    qty,
    price: Number(p.price),
    subtotal: Number(p.price) * Number(qty),
    status: "pending",
    locked: false,
    createdAt: new Date().toISOString()
  };

  await appendOrder(order);
  res.json({ ok: true });
});

export default router;
