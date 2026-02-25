import axios from "axios";

const LINE_API = "https://api.line.me/v2/bot/message/push";

export async function pushMessage(to, message) {
  await axios.post(
    LINE_API,
    {
      to,
      messages: [{ type: "text", text: message }]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      }
    }
  );
}
