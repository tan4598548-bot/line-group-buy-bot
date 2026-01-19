const orderService = require('./orderService');

async function handleOutOfStock(productCode, sendMessage) {
  const removedCount = orderService.removeByProductCode(productCode);

  if (removedCount === 0) {
    await sendMessage(`⚠️ 商品 ${productCode} 目前沒有任何訂單`);
    return;
  }

  await sendMessage(
    `🚫 斷貨通知\n\n` +
    `商品 ${productCode} 已斷貨\n` +
    `❌ 已取消 ${removedCount} 筆訂單\n\n` +
    `如有疑問請私訊團主`
  );
}

module.exports = {
  handleOutOfStock
};
