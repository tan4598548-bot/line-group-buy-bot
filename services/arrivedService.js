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
 * 確認到貨 (對齊 adminArrival.js 的需求)
 */
export async function markArrived(items) {
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

  await syncVendorOrders(getAllOrders());
}

// 別名導向，確保 confirmArrived 也能用
export const confirmArrived = markArrived;

// 預設匯出
const arrivedService = {
  getArrivalList,
  markArrived,
  confirmArrived
};

export default arrivedService;