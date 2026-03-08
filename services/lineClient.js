import axios from "axios";

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_API = "https://api.line.me/v2/bot/message/push";

/**
 * 核心 LINE 傳送實例
 * 提供 pushMessage 方法以供 index.js 調用
 */
export const client = {
  async pushMessage(to, message) {
    try {
      // 支援傳入純文字字串或 LINE 訊息物件陣列
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
      console.error("❌ LINE Push 失敗:", e.response?.data || e.message);
      throw e;
    }
  }
};

export default client;