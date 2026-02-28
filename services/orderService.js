import sheetService from "./sheetService.js";

export const orderService = {
  /**
   * 取得所有訂單 (管理端使用)
   */
  async getAllOrders() {
    try {
      // 直接呼叫 sheetService 取得已經對齊標題的資料
      const orders = await sheetService.getOrders();
      console.log(`✅ [orderService] 成功獲取 ${orders.length} 筆訂單`);
      return orders;
    } catch (e) {
      console.error("❌ [orderService] 取得訂單失敗:", e.message);
      throw e;
    }
  },

  /**
   * 取得特定買家的訂單 (買家端「我的訂單」使用)
   */
  async getOrdersByUserId(userId) {
    try {
      const allOrders = await sheetService.getOrders();
      // 這裡假設 sheetService 的 getOrders 有回傳 line_id 供過濾
      return allOrders.filter(o => o.lineId === userId);
    } catch (e) {
      console.error("❌ [orderService] 取得買家訂單失敗:", e.message);
      throw e;
    }
  }
};

export default orderService;