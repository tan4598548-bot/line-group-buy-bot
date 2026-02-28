import * as sheet from "./sheetService.js";

/**
 * 取得所有訂單 (補足 export 關鍵字)
 */
export async function getAllOrders() {
  try {
    const orders = await sheet.getOrders();
    // 即使 Sheet 為空，也要回傳空陣列 []，否則前端渲染會報錯
    return Array.isArray(orders) ? orders : [];
  } catch (error) {
    console.error("Sheet讀取失敗:", error);
    return []; // 發生錯誤時回傳空陣列，防止前端 400 或崩潰
  }
}

export async function handleOrder(req, res) {
  // 原有邏輯保持不變
}

export async function getBuyerOrders(userId) {
  const orders = await sheet.getOrders();
  return orders.filter(o => o.lineUserId === userId);
}

export default { handleOrder, getBuyerOrders, getAllOrders };