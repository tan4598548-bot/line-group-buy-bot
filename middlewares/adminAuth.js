// middlewares/adminAuth.js
export default function adminAuth(req, res, next) {
  const userId = req.header("X-LIFF-USER-ID");
  const role = req.header("X-LIFF-ROLE");

  if (!userId) {
    return res.status(401).json({ error: "Missing LIFF User ID" });
  }

  if (role !== "admin") {
    return res.status(403).json({ error: "Not admin role" });
  }

  const admins = (process.env.ADMIN_LINE_IDS || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);

  if (!admins.includes(userId)) {
    return res.status(403).json({ error: "Admin only" });
  }

  // 🔐 通過驗證
  req.adminUserId = userId;
  next();
}
