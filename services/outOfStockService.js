const orderService = require('./orderService');

/**
 * 商品斷貨處理
 * 回傳：{ removed, affectedUsers }
 */
function handleOutOfStock(productCode) {
  const orders = orderService.getAllOrders();

  const affected = orders.filter(o => o.productCode === productCode);
  const affectedUsers = [...new Set(affected.map(o => o.userId))];

  const removed = orderService.removeByProductCode(productCode);

  return {
    removed,
    affectedUsers
  };
}

module.exports = {
  handleOutOfStock
};
