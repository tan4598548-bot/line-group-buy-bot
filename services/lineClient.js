import axios from "axios";

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_API = "https://api.line.me/v2/bot/message/push";

/**
 * 核心 LINE 傳送實例
 */
export const client = {
  /**
   * 傳送訊息 (相容於官方 SDK 語法)
   * @param {string} to - LINE User ID
   * @param {object|string} message - 訊息物件或純文字
   */
  async pushMessage(to, message) {
    try {
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
      console.log(`✅ LINE 訊息已傳送至: ${to}`);
    } catch (e) {
      console.error("❌ LINE Push 失敗:", e.response?.data || e.message);
      throw e;
    }
  }
};

export default client;