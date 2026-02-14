import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import line from "@line/bot-sdk";

/* ===== ESM dirname ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===== LINE Config ===== */
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(lineConfig);

/* ===== Routes ===== */
import adminRoutes from "./routes/adminRoutes.js";
import adminArrivalRoutes from "./routes/adminArrival.js";
import adminShippingRoutes from "./routes/adminShipping.js";
import adminProductRoutes from "./routes/adminProduct.js";
import buyerOrderRoutes from "./routes/buyerOrder.js";

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

const app = express();
app.use(express.json());

/* ===== Static ===== */
app.use(express.static(path.join(__dirname, "public")));
app.use("/pdf", express.static(path.join(__dirname, "pdf")));

/* ===== LINE Webhook ===== */
app.post(
  "/webhook",
  line.middleware(lineConfig),
  async (req, res) => {
    const events = req.body.events;

    for (const event of events) {
      console.log(JSON.stringify(event, null, 2));
    }

    res.json({ success: true });
  }
);

/* ===== Admin APIs ===== */
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminArrivalRoutes);
app.use("/api/admin", adminShippingRoutes);
app.use("/api/admin", adminProductRoutes);

/* ===== Buyer APIs ===== */
app.use("/api/buyer", buyerOrderRoutes);

/* ===== Server ===== */
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
