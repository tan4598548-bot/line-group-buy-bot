// ... (保留前面 import 內容)

const app = express();
app.use(express.json());

// 確保 public 是根目錄，且子資料夾 liff 被正確映射
app.use(express.static(path.join(__dirname, "public")));
app.use("/liff", express.static(path.join(__dirname, "public/liff")));

// Debug 中間層：如果 ID 還是 undefined，這裡會直接攔截並提示
app.use((req, res, next) => {
  const userId = req.header("x-liff-user-id");
  if (req.url.startsWith("/api/admin")) {
    console.log(`[API Log] ${req.method} ${req.url} | Header ID: ${userId}`);
  }
  next();
});

// 核心 API 路由
app.get("/api/admin/orders", async (req, res) => {
  const userId = req.header("x-liff-user-id");
  
  // 如果 ID 依然是 undefined，回傳明確錯誤給前端
  if (!userId || userId === "undefined") {
    return res.status(400).json({ error: "前端未傳送有效的 LINE ID" });
  }

  try {
    const orders = await orderService.getAllOrders();
    res.json(orders || []);
  } catch (e) {
    console.error("Orders Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ... (其他路由保持不變)