module.exports = {
  ORDER_LOCKED: '⛔ 本團已截止下單，無法再新增訂單',

  ORDER_SUCCESS: (order) =>
    `✅ 下單成功\n商品：${order.productCode}\n數量：${order.qty}\n顏色：${order.colors.join(', ')}\n尺寸：${order.size}`
};
