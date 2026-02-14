import express from "express";
import path from "path";
import { fileURLToPath } from "url";

/* ===== ESM dirname support ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===== Routes ===== */
import adminRoutes from "./routes/adminRoutes.js";
import adminArrivalRoutes from "./routes/adminArrival.js";
import adminShippingRoutes from "./routes/adminShipping.js";
import adminProductRoutes from "./routes/adminproduct.js";
import adminOverstockRoutes from "./routes/adminOverstock.js";
import adminOverstockStatsRoutes from "./routes/adminOverstockStats.js";
import buyerOrderRoutes from "./routes/buyerOrder.js";
import overstockRoutes from "./routes/overstock.js";
import line from "@line/bot-sdk";

/* ===== LINE Config ===== */
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(lineConfig);
/* ===== Services ===== */
import {
  getProducts,
  updateProductStatus,
  markProductClosed,
  getBuyerOrders,
  getShippingList,
  markOrdersShipped,
  getBuyerPendingOrders,
  getProductsClosingTomorrow,
  getBuyerPackingList
} from "./services/sheetService.js";

import { generateShippingPdf } from "./services/pdfService.js";
import { generateBuyerPackingPdf } from "./services/buyerPackingPdfService.js";

/* ===== App ===== */
const app = express();

app.use(express.json());

/* =====================
   靜態資料夾
===================== */
app.use(express.static(path.join(__dirname, "public")));
app.use("/pdf", express.static(path.join(__dirname, "pdf")));

/* =====================
   管理員 API
===================== */
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminArrivalRoutes);
app.use("/api/admin", adminShippingRoutes);
app.use("/api/admin", adminProductRoutes);
app.use("/api/admin/overstock", adminOverstockRoutes);
app.use("/api/admin/overstock", adminOverstockStatsRoutes);

/* =====================
   買家 API
===================== */
app.use("/api/buyer", buyerOrderRoutes);

/* =====================
   溢多商品
===================== */
app.use("/api/overstock", overstockRoutes);

/* =====================
   商品清單
===================== */
app.get("/api/products", async (req, res) => {
  try {
    res.json(await getProducts());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   商品上下架
===================== */
app.post("/api/product/active", async (req, res) => {
  try {
    const { productCode, active } = req.body;
    await updateProductStatus(productCode, active);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* =====================
   商品結單
===================== */
app.post("/api/product/close", async (req, res) => {
  try {
    const { productCode } = req.body;
    await markProductClosed(productCode);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* =====================
   買家訂單
===================== */
app.get("/api/buyer/orders", async (req, res) => {
  try {
    res.json(await getBuyerOrders(req.query.userId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   買家待出貨
===================== */
app.get("/api/buyer/pending", async (req, res) => {
  try {
    res.json(await getBuyerPendingOrders(req.query.userId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   管理出貨清單
===================== */
app.get("/api/admin/shipping-list", async (req, res) => {
  try {
    res.json(await getShippingList());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   標記出貨 + PDF
===================== */
app.post("/api/admin/ship", async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds?.length) {
      return res.status(400).json({ error: "未選擇出貨項目" });
    }

    const shipped = await markOrdersShipped(orderIds);
    const pdfPath = await generateShippingPdf(shipped);

    res.json({
      ok: true,
      pdfUrl: `/pdf/${path.basename(pdfPath)}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   買家揀貨 PDF
===================== */
app.get("/api/admin/buyer-packing-pdf", async (req, res) => {
  try {
    const list = await getBuyerPackingList();
    if (!list.length) {
      return res.status(400).json({ error: "目前無可列印資料" });
    }

    const pdfPath = await generateBuyerPackingPdf(list);

    res.json({
      ok: true,
      pdfUrl: `/pdf/${path.basename(pdfPath)}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   結單提醒
===================== */
app.get("/api/admin/close-reminder", async (req, res) => {
  try {
    const products = await getProductsClosingTomorrow();
    if (!products.length) {
      return res.json({ text: "明日無即將結單商品" });
    }

    const list = products
      .map((p, i) => `${i + 1}. ${p.productName}`)
      .join("\n");

    res.json({
      text: `⚠️【結單提醒】\n\n${list}\n\n請盡速下單`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================
   LINE Webhook
===================== */
app.post(
  "/webhook",
  line.middleware(lineConfig),
  async (req, res) => {
    try {
      const events = req.body.events;

      for (const event of events) {
        console.log("====== EVENT ======");
        console.log(JSON.stringify(event, null, 2));

        // 👇 這裡才會出現 groupId
        if (event.source?.groupId) {
          console.log("🔥 GROUP ID =", event.source.groupId);
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
);


/* =====================
   404 fallback
===================== */
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

/* =====================
   Server
===================== */
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
