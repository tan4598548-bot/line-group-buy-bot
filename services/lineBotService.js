import axios from "axios";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export async function pushMessage(to, messages) {
  if (!to) return;

  await axios.post(
    LINE_PUSH_URL,
    {
      to,
      messages
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}
