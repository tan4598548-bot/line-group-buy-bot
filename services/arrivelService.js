import { getOrders, updateOrderStatus } from "./sheetService.js";

export async function getArrivalList() {
  const orders = await getOrders();
  // 僅回傳尚未點貨的訂單
  return orders.filter(o => o.status === "ordered");
}

export async function markArrived(items) {
  const orders = await getOrders();
  for (const item of items) {
    const order = orders.find(o => o.orderId === item.orderId);
    if (order) {
      await updateOrderStatus(order._row, "arrived");
    }
  }
}

export default { getArrivalList, markArrived };