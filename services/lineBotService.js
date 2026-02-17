/**
 * 管理員驗證中間層
 */
export default function adminAuth(req, res, next) {
  const userId = req.header("X-LIFF-USER-ID") || req.header("x-liff-user-id");
  const role = req.header("X-LIFF-ROLE") || req.header("x-liff-role");

  if (!userId) {
    return res.status(401).json({ ok: false, error: "Missing LIFF User ID" });
  }

  if (role !== "admin") {
    return res.status(403).json({ ok: false, error: "Not admin role" });
  }

  const admins = (process.env.ADMIN_LINE_IDS || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);

  if (!admins.includes(userId)) {
    console.warn(`🚫 拒絕存取：用戶 ${userId} 不在管理員清單內`);
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  req.adminUserId = userId;
  next();
}

/**
 * 處理 Webhook 事件 (建議放在此處供 index.js 呼叫)
 */
export const handleLineEvent = async (event) => {
  const { source, message, type } = event;
  
  // 核心修正：明確標示 ID 來源
  const uid = source.userId;
  const gid = source.groupId;
  
  console.log(`--- New Event: ${type} ---`);
  if (gid) console.log(`📢 Group ID: ${gid}`);
  if (uid) console.log(`👤 User ID: ${uid}`); // 只要有人發言，這裡一定會印出 U... 開頭的 ID
  
  if (type === 'message' && message.type === 'text') {
    console.log(`💬 Content: ${message.text}`);
  }
};