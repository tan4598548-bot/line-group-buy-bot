import fetch from "node-fetch";

const LINE_API = "https://api.line.me/v2/bot/message/push";
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * 推播訊息
 */
export async function pushMessage(to, text) {
  await fetch(LINE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }]
    })
  });
}
