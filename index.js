import express from "express";
import { 
  getProducts, 
  updateProductStatus, 
  markProductClosed, 
  getBuyerOrders 
} from "./services/sheetService.js";
import { handleOrder } from "./services/orderService.js";

const app = express();

// 使用內建的 json 解析器，取代 bodyParser
app.use(express.json());

/* =====================
   商品清單（供 LIFF 呼叫）
===================== */
app.get("/api/products", async (req, res) => {
  try {
    const data = await getProducts();
    res.json(data);
  } catch (error) {
    console.error("取得商品失敗:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* =====================
   商品上下架（管理端）
===================== */
app.post("/api/product/active", async (req, res) => {
  try {
    const { productCode, active } = req.body;
    // 對接 sheetService.js 中的 updateProductStatus
    await updateProductStatus(productCode, active);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* =====================
   商品結單（管理端）
===================== */
app.post("/api/product/close", async (req, res) => {
  try {
    const { productCode } = req.body;
    // 對接 sheetService.js 中的 markProductClosed
    await markProductClosed(productCode);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* =====================
   買家訂單查詢（供 LIFF 呼叫）
===================== */
app.get("/api/buyer/orders", async (req, res) => {
  try {
    const { userId } = req.query;
    // 對接 sheetService.js 中的 getBuyerOrders
    const data = await getBuyerOrders(userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================
   啟動伺服器
===================== */
// 使用 Render 建議的 Port 與 0.0.0.0 綁定以解決 Port Scan Timeout
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});