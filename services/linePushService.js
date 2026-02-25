import { pushMessage } from "./lineClient.js";

export async function sendCloseReminder(groupId, productList) {
  const text = `⚠️【明日結單提醒】\n\n${productList}`;
  await pushMessage(groupId, text);
}
