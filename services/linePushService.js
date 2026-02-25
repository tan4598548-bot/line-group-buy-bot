import axios from "axios";

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

export async function sendPush(to, messages) {
  try {
    await axios.post("https://api.line.me/v2/bot/message/push", {
      to,
      messages: Array.isArray(messages) ? messages : [{ type: "text", text: messages }]
    }, {
      headers: { "Authorization": `Bearer ${LINE_TOKEN}`, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Line Push 失敗:", e.response?.data);
  }
}

export default { sendPush };