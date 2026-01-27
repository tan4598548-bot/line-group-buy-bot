/**
 * dispatchService.js
 * 功能：
 * - 只取得可出貨的訂單
 */

function getDispatchOrders(orders) {
  return orders
    .filter(o => o.arrivedQty && o.arrivedQty > 0)
    .map(o => ({
      ...o,
      quantity: o.arrivedQty   // 出貨只看已到貨數量
    }));
}

module.exports = {
  getDispatchOrders
};
