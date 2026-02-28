import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import productService from "./services/productService.js";
import orderService from "./services/orderService.js";
// ... (其餘 import 保持不變)

const app = express();
app.use(express.json());

// 靜態檔案路徑：明確包含 /liff
app.use(express.static(path.join(__dirname, "public")));
app.use("/liff", express.static(path.join(__dirname, "public/liff")));

// 測試用路徑：請嘗試在瀏覽器直接打開 https://您的網址/api/test
app.get("/api/test", (req, res) => {
  res.send("✅ API Server is reachable!");
});

// 核心訂單路徑
app.get("/api/admin/orders", async (req, res) => {
  const userId = req.header("x-liff-user-id");
  console.log(`📡 [API Call] /api/admin/orders | User: ${userId}`); // 這行必須在 Logs 出現
  
  if (!userId) return res.status(400).json({ error: "Missing User ID" });

  try {
    const orders = await orderService.getAllOrders();
    res.json(orders || []);
  } catch (e) {
    console.error("❌ API Error:", e);
    res.status(500).send(e.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));