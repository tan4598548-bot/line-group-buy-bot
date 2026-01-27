import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import {
  getProducts,
  updateProductStatus,
  markProductClosed,
  getTomorrowClosingProducts,
  markReminderSent
} from "./services/sheetService.js";

const app = express();
app.use(bodyParser.json());

/* =========================
   基本設定
========================= */

const PORT = process.env.PORT || 3000;

/* =========================
   LIFF 商品管理（版主）
========================= */

/**
 * 商品管理清單（含上下架 / 結單狀態）
 * GET /api/products/manage
 */
app.get("/api/products/manage", async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 商品上下架切換
 * POST /api/products/toggle
 * body: { productCode, active }
 */
app.post("/api/products/toggle", async (req, res) => {
  const { productCode, active } = req.body;
  try {
    await updateProductStatus(productCode, active);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 手動結單
 * POST /api/products/close
 * body: { productCode }
 */
app.post("/api/products/close", async (req, res) => {
  const { productCode } = req.body;
  try {
    await markProductClosed(productCode);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ✅ 免費版「結單前一天提醒」
   （進 LIFF 即觸發）
========================= */

/**
 * 檢查明天要結單的商品
 * GET /api/check-close-reminder
 *
 * 回傳「可直接貼群的公告文字」
 */
app.get("/api/check-close-reminder", async (req, res) => {
  try {
    const products = await getTomorrowClosingProducts();

    if (products.length === 0) {
      return res.json({
        hasReminder: false,
        message: "無需提醒"
      });
    }

    const productNames = products.map(p => `• ${p.productName}`).join("\n");

    const announceText = `📢【結單提醒｜最後一天】\n\n以下商品將於「明天結單」：\n\n${productNames}\n\n🕗 想下單的請盡快至記事本 / LIFF 下單\n（結單後將無法下單）`;

    // 標記已提醒（避免重複）
    for (const p of products) {
      await markReminderSent(p.productCode);
    }

    res.json({
      hasReminder: true,
      announceText
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   健康檢查
========================= */

app.get("/", (req, res) => {
  res.send("LINE Group Buy Bot API is running");
});

/* =========================
   啟動
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
