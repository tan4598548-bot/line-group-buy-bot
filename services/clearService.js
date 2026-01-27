/**
 * clearService.js
 * 功能：
 * - 清除已出貨（arrivedQty）
 */

function clearArrived(orders) {
  orders.forEach(o => {
    o.arrivedQty = 0;
  });
  return orders;
}

module.exports = {
  clearArrived
};
