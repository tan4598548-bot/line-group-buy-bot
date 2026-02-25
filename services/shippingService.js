import { getOrders, updateOrderStatus } from "./sheetService.js";

export async function getShippingList() {
  const orders = await getOrders();
  return orders.filter(o => o.status === "ordered");
}

export async function markOrdersShipped(orderIds) {
  const orders = await getOrders();
  const shipped = [];

  for (const o of orders) {
    if (orderIds.includes(o.orderId)) {
      await updateOrderStatus(o._row, "shipped");
      shipped.push(o);
    }
  }

  return shipped;
}

export default { getShippingList, markOrdersShipped };
