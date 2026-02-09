import { pushMessage } from "./lineBotService.js";

export async function notifyOverstockSuccess({
  buyerLineId,
  buyerName,
  productName,
  spec,
  price
}) {
  const text = `🔥 現貨出清搶購成功！

商品：${productName}
規格：${spec}
價格：NT$${price}

👤 買家：${buyerName}
⏰ 時間：${new Date().toLocaleTimeString("zh-TW")}`;

  await pushMessage(buyerLineId, [
    {
      type: "text",
      text
    }
  ]);
}
