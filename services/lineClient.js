import axios from "axios";

// 從環境變數讀取 LINE 憑證
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_API = "https://api.line.me/v2/bot/message/push";

/**
 * 核心 LINE 傳送實例
 * 提供 pushMessage 方法以供 index.js 調用
 */
export const client = {
  /**
   * 傳送 Push Message 給指定用戶
   * @param {string} to - LINE User ID
   * @param {string|object|array} message - 訊息內容
   */
  async pushMessage(to, message) {
    // 若沒有 Token 則跳過，避免程式崩潰
    if (!LINE_TOKEN) {
      console.error("❌ 錯誤: 缺少 LINE_CHANNEL_ACCESS_TOKEN 環境變數");
      return;
    }

    try {
      // 自動轉換輸入格式：
      // 1. 若是純文字字串 -> 轉為 LINE 文字物件格式
      // 2. 若是單一物件 -> 轉為陣列格式
      // 3. 若已是陣列 -> 直接使用
      const messages = typeof message === 'string' 
        ? [{ type: "text", text: message }] 
        : (Array.isArray(message) ? message : [message]);

      await axios.post(
        LINE_API,
        { to, messages },
        {
          headers: {
            "Authorization": `Bearer ${LINE_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
      console.log(`✅ LINE 訊息傳送成功 -> User: ${to}`);
    } catch (e) {
      // 詳細紀錄 LINE API 回傳的錯誤原因 (例如 Token 過期或 ID 錯誤)
      console.error("❌ LINE Push 失敗:", e.response?.data || e.message);
      throw e; 
    }
  }
};

export default client;