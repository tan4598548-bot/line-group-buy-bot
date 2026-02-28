import * as sheet from "./sheetService.js";

// 取得所有訂單 (用於管理端 2. 訂單查詢)
export async function getAllOrders() {
  try {
    const orders = await sheet.getOrders();
    // 確保回傳的是 Array，否則前端渲染會崩潰
    return Array.isArray(orders) ? orders : [];
  } catch (error) {
    throw new Error("無法從 Google Sheet 取得訂單: " + error.message);
  }
}

export async function handleOrder(req, res) {
  // ...保持原本的 handleOrder 邏輯
}

export async function getBuyerOrders(userId) {
  const orders = await sheet.getOrders();
  return orders.filter(o => o.lineUserId === userId);
}

export default { handleOrder, getBuyerOrders, getAllOrders };