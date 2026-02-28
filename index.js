import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 匯入服務層 (確保路徑正確)
import productService from "./services/productService.js";
import orderService from "./services/orderService.js";

const app = express();
app.use(express.json());

// 靜態檔案路徑：指向 public 資料夾
app.use(express.static(path.join(__dirname, "public")));

// --- API 路由區 ---

// 1. 測試連線路徑
app.get("/api/test", (req, res) => {
  res.send("✅ API Server is reachable!");
});

// 2. 獲取商品清單 (解決 404 的關鍵)
app.get("/api/products", async (req, res) => {
  try {
    console.log("📡 [API Call] /api/products");
    const products = await productService.listProducts(); // 呼叫 productService
    res.json(products || []);
  } catch (e) {
    console.error("❌ Product API Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 3. 管理端獲取所有訂單
app.get("/api/admin/orders", async (req, res) => {
  const userId = req.header("x-liff-user-id");
  console.log(`📡 [API Call] /api/admin/orders | User: ${userId}`);
  
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders || []);
  } catch (e) {
    console.error("❌ Admin Orders API Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 4. 買家獲取個人訂單 (預留給未來擴充)
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 所有路徑找不到時，預設回傳 index.html 或 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) res.status(404).send("Page not found");
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動於通訊埠 ${PORT}`);
  console.log(`🔗 測試路徑: http://localhost:${PORT}/api/test`);
});