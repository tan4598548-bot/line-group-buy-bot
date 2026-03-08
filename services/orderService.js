import sheetService from "./sheetService.js";

export const orderService = {
  /** 取得所有訂單 (管理端使用) */
  async getAllOrders() {
    try {
      return await sheetService.getOrders();
    } catch (e) {
      console.error("❌ [orderService] 取得所有訂單失敗:", e.message);
      throw e;
    }
  },

  /** 取得特定買家的訂單 */
  async getOrdersByUserId(userId) {
    try {
      const allOrders = await sheetService.getOrders();
      return allOrders.filter(o => o.buyerId === userId || o.lineId === userId);
    } catch (e) {
      console.error("❌ [orderService] 取得買家訂單失敗:", e.message);
      throw e;
    }
  },

  /** 建立新訂單 (買家下單) - 強化規格驗證 */
  async createOrder(data) {
    try {
      // 驗證：規格必須包含顏色與尺寸，且不能為空
      if (!data.spec || data.spec.includes('undefined') || data.spec === "") {
        throw new Error("規格未選定，訂單不成立");
      }

      const orderData = {
        orderId: `ORD${Date.now()}`,
        buyerId: data.buyerId,
        buyerName: data.buyerName,
        productCode: data.productCode,
        productName: data.productName,
        spec: data.spec,
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

  /** 更新訂單 (處理數量修改與拆單) */
  async updateOrder(orderId, updateData) {
    try {
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
  },

  /** 刪除訂單 (買家端操作) */
  async deleteOrder(orderId) {
    try {
      return await sheetService.updateOrderAndSplit(orderId, { status: "買家取消" });
    } catch (e) {
      console.error(`❌ [orderService] 刪除訂單 ${orderId} 失敗:`, e.message);
      throw e;
    }
  }
};

export default orderService;