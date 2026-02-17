// services/lineBotService.js

/**
 * adminAuth 中間層：驗證發起請求的用戶是否為管理員
 */
export default function adminAuth(req, res, next) {
  // 從請求標頭中獲取 LIFF 傳過來的 User ID (不分大小寫)
  const userId = req.header("X-LIFF-USER-ID") || req.header("x-liff-user-id");
  const role = req.header("X-LIFF-ROLE") || req.header("x-liff-role");

  // 1. 如果沒有傳入 User ID
  if (!userId) {
    console.error("🚫 拒絕存取：缺少 User ID Header");
    return res.status(401).json({ ok: false, error: "Missing LIFF User ID" });
  }

  // 2. 取得環境變數中的管理員名單 (格式預期為: U123,U456)
  const adminIdsStr = process.env.ADMIN_LINE_IDS || "";
  const admins = adminIdsStr.split(",").map(id => id.trim()).filter(Boolean);

  // 3. 檢查此 ID 是否在名單內
  if (!admins.includes(userId)) {
    console.warn(`⚠️ 權限錯誤：用戶 ${userId} 嘗試存取管理 API，但不在管理員名單內。`);
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  // 4. 驗證通過，繼續執行後續動作
  console.log(`✅ 管理員驗證成功: ${userId}`);
  req.adminUserId = userId;
  next();
}