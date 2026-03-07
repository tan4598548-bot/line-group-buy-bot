import client from "./lineClient.js";

/**
 * 高階推播服務
 */
export const sendPush = async (to, messages) => {
  return await client.pushMessage(to, messages);
};

export default { sendPush };