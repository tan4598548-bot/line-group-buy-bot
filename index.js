import 'dotenv/config'; 
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sheetService from "./services/sheetService.js";
import orderService from "./services/orderService.js";
import { client } from "./services/lineClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/products", async (req, res) => res.json(await sheetService.getProducts(req.query.filter)));
app.post("/api/products", async (req, res) => res.json({ code: await sheetService.appendProduct(req.body) }));
app.put("/api/products/:code", async (req, res) => { await sheetService.updateProduct(req.params.code, req.body); res.json({ ok: true }); });

app.post('/api/admin/products/out-of-stock', async (req, res) => {
  const { productCode, productName } = req.body;
  const buyers = await sheetService.getBuyersByProduct(productCode);
  await sheetService.updateProductStatus(productCode, '斷貨');
  await Promise.all(buyers.map(async (b) => {
    try { await client.pushMessage(b.lineId, { type: 'text', text: `【斷貨通知】\n商品「${productName}」因故斷貨，已取消訂單。` }); } catch (e) {}
  }));
  res.json({ ok: true });
});

app.get("/api/admin/orders", async (req, res) => res.json(await sheetService.getOrders()));
app.post("/api/admin/orders", async (req, res) => {
  try { await sheetService.appendOrder(req.body); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));