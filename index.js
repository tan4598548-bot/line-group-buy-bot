import express from "express";
import path from "path";
import { fileURLToPath } from "url";

/* ===== ESM dirname ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

/* ===== Routes & Services ===== */
import adminRoutes from "./routes/adminRoutes.js";
import adminArrivalRoutes from "./routes/adminArrival.js";
import adminShippingRoutes from "./routes/adminShipping.js";
import adminProductRoutes from "./routes/adminProduct.js";
import buyerOrderRoutes from "./routes/buyerOrder.js";

/* ===== LINE Webhook (查 Group ID 專用) ===== */
app.post(["/webhook", "/callback"], (req, res) => {
  console.log("========================================");
  console.log("📢 Webhook Triggered!");
  
  const events = req.body.events;
  if (events && events.length > 0) {
    events.forEach((event) => {
      console.log(`📍 Event Type: ${event.type}`);
      if (event.source && event.source.type === 'group') {
        console.log(`🆔 群組 ID (GroupID): ${event.source.groupId}`);
      }
      if (event.source && event.source.type === 'user') {
        console.log(`👤 使用者 ID (UserID): ${event.source.userId}`);
      }
    });
  } else {
    console.log("⚠️ No events found in request body.");
  }
  console.log("========================================");
  res.sendStatus(200);
});

/* ===== APIs ===== */
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminArrivalRoutes);
app.use("/api/admin", adminShippingRoutes);
app.use("/api/admin", adminProductRoutes);
app.use("/api/buyer", buyerOrderRoutes);

app.use(express.static(path.join(__dirname, "public")));
app.use("/pdf", express.static(path.join(__dirname, "pdf")));

/* ===== Server ===== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});