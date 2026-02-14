import { 
  getPendingOrders, 
  markOrdersShipped as markShippedInSheet 
} from "./sheetService.js";

/**
 * 取得待出貨清單
 */
export async function getShippingList() {
  return await getPendingOrders();
}

/**
 * 執行出貨 (對齊 adminShipping.js 的需求)
 */
export async function markOrdersShipped(rowIndices) {
  if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
    throw new Error("未提供出貨行號");
  }
  return await markShippedInSheet(rowIndices);
}

/**
 * 別名導向，確保 processShipping 也能用
 */
export const processShipping = markOrdersShipped;

// 建立物件供預設匯出
const shippingService = {
  getShippingList,
  markOrdersShipped,
  processShipping
};

export default shippingService;