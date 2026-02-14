import { getAllOrders, deleteOrder, editOrder } from './orderService.js';
import { syncVendorOrders } from './sheetService.js';

/**
 * 給 LIFF 用的「可讀商品清單」
 */
export function getArrivalList() {
  const orders = getAllOrders();
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
export async function confirmArrived(items) {
  let orders = getAllOrders();

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
          deleteOrder(i);
          orders.splice(i, 1);
          i--;
        } else {
          editOrder(i, { quantity: o.quantity - take });
          orders[i].quantity -= take;
        }
      }
    }
  });

  // 同步廠商訂貨表（只剩未到貨）
  await syncVendorOrders(getAllOrders());
}

// 為了配合你 adminRoutes.js 的 import arrivedService from ...
// 我們加上這個 default 匯出
export const arrivedService = {
  getArrivalList,
  confirmArrived
};

export default arrivedService;