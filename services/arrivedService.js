const orderService = require('./orderService');
const sheetService = require('./sheetService');

/**
 * 給 LIFF 用的「可讀商品清單」
 */
function getArrivalList() {
  const orders = orderService.getAllOrders();
  const map = {};

  orders.forEach(o => {
    const key = `${o.productName}|${o.color}|${o.size}`;
    if (!map[key]) {
      map[key] = {
        productName: o.productName,
        color: o.color,
        size: o.size,
        quantity: 0
      };
    }
    map[key].quantity += o.quantity;
  });

  return Object.values(map);
}

/**
 * 確認到貨
 */
async function confirmArrived(items) {
  let orders = orderService.getAllOrders();

  items.forEach(item => {
    let need = item.quantity;

    for (let i = 0; i < orders.length && need > 0; i++) {
      const o = orders[i];
      if (
        o.productName === item.productName &&
        o.color === item.color &&
        o.size === item.size
      ) {
        const take = Math.min(o.quantity, need);
        need -= take;

        if (take === o.quantity) {
          orderService.deleteOrder(i);
          orders.splice(i, 1);
          i--;
        } else {
          orderService.editOrder(i, { quantity: o.quantity - take });
          orders[i].quantity -= take;
        }
      }
    }
  });

  // 同步廠商訂貨表（只剩未到貨）
  await sheetService.syncVendorOrders(orderService.getAllOrders());
}

module.exports = {
  getArrivalList,
  confirmArrived
};
