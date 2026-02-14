import express from "express";
import path from "path";
import { fileURLToPath } from "url";
// 暫時不引用 line-sdk middleware 以排除解析問題

/* ===== ESM dirname ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 注意：如果 LINE 送來的資料是 JSON，這行必須在前面
app.use(express.json());

/* ===== Routes & Services (保留你的引用) ===== */
import adminRoutes from "./routes/adminRoutes.js";
import adminArrivalRoutes from "./routes/adminArrival.js";
import adminShippingRoutes from "./routes/adminShipping.js";
import adminProductRoutes from "./routes/adminProduct.js";
import buyerOrderRoutes from "./routes/buyerOrder.js";

/* ===== LINE Webhook (測試重點) ===== */
app.post(["/webhook", "/callback"], (req, res) => {
  console.log("========================================");
  console.log("📢 收到 Webhook 請求！");
  
  const events = req.body.events;
  if (events) {
    events.forEach((event) => {
      if (event.source.type === 'group') {
        console.log(`🆔 群組 ID (GroupID): ${event.source.groupId}`);
      }
    });
  }
  console.log("========================================");
  res.sendStatus(200); 
});
  }
  console.log("========================================");
  res.sendStatus(200); // 務必回傳 200 給 LINE
});

/* ===== 其他 API (保留) ===== */
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
  console.log(`🚀 偵測機器人啟動成功，通訊埠： ${PORT}`);
});