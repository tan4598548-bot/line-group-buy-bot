import dotenv from 'dotenv';
dotenv.config();

const ADMIN_LINE_IDS = process.env.ADMIN_LINE_IDS
  ? process.env.ADMIN_LINE_IDS.split(',').map(id => id.trim())
  : [];

export function verifyAdmin(req, res, next) {
  // 統一與 index.js 的 header 命名
  const lineId = req.headers['x-liff-user-id'] || req.headers['X-LIFF-USER-ID'];

  if (!lineId) {
    return res.status(401).json({ error: 'Missing LINE ID' });
  }

  if (!ADMIN_LINE_IDS.includes(lineId)) {
    return res.status(403).json({ error: 'Admin only access' });
  }

  next();
}

export default verifyAdmin;