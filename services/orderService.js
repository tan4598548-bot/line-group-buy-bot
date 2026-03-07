import sheetService from "./sheetService.js";

export const orderService = {
  /**
   * 取得所有訂單 (管理端使用)
   */
  async getAllOrders() {
    try {
      const orders = await sheetService.getOrders();
      return orders;
    } catch (e) {
      console.error("❌ [orderService] 取得所有訂單失敗:", e.message);
      throw e;
    }
  },

  /**
   * 取得特定買家的訂單 (買家端「我的訂單」使用)
   */
  async getOrdersByUserId(userId) {
    try {
      const allOrders = await sheetService.getOrders();
      // 對齊 buyerId 欄位 (請確認試算表標題為 buyerId 或 lineId)
      return allOrders.filter(o => o.buyerId === userId || o.lineId === userId);
    } catch (e) {
      console.error("❌ [orderService] 取得買家訂單失敗:", e.message);
      throw e;
    }
  },

  /**
   * 建立新訂單 (買家下單)
   */
  async createOrder(data) {
    try {
      const orderData = {
        orderId: `ORD${Date.now()}`,
        buyerId: data.buyerId,
        buyerName: data.buyerName,
        productCode: data.productCode,
        productName: data.productName,
        spec: data.spec || "",
        qty: Number(data.qty) || 1,
        price: Number(data.price) || 0,
        total: (Number(data.price) || 0) * (Number(data.qty) || 1),
        status: data.status || "待點貨",
        orderDate: new Date().toLocaleDateString('zh-TW')
      };
      return await sheetService.appendOrder(orderData);
    } catch (e) {
      console.error("❌ [orderService] 建立訂單失敗:", e.message);
      throw e;
    }
  },

  /**
   * 更新訂單狀態或數量 (對齊買家修改/團主操作)
   */
  async updateOrder(orderId, updateData) {
    try {
      // 若有數量變更但沒總價，自動重算
      if (updateData.qty && !updateData.total) {
        const orders = await sheetService.getOrders();
        const target = orders.find(o => String(o.orderId) === String(orderId));
        if (target) {
          updateData.total = Number(target.price) * Number(updateData.qty);
        }
      }
      return await sheetService.updateOrderAndSplit(orderId, updateData);
    } catch (e) {
      console.error(`❌ [orderService] 更新訂單 ${orderId} 失敗:`, e.message);
      throw e;
    }
  }
};

export default orderService;