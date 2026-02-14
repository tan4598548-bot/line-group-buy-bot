import { 
  getPendingOrders, 
  markOrdersShipped 
} from "./sheetService.js";

/**
 * 取得待出貨清單
 */
export async function getShippingList() {
  return await getPendingOrders();
}

/**
 * 執行出貨（更新狀態為 shipped）
 */
export async function processShipping(rowIndices) {
  if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
    throw new Error("未提供出貨行號");
  }
  return await markOrdersShipped(rowIndices);
}

// 建立物件供預設匯出，解決 adminRoutes.js 的 SyntaxError
const shippingService = {
  getShippingList,
  processShipping
};

export default shippingService;