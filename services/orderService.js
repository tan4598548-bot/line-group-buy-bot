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

  /** 建立新訂單 (買家下單) */
  async createOrder(data) {
    try {
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

  /** 核心功能：結單並轉入廠商管理 (VendorOrders) */
  async finalizeOrder(orderId) {
    try {
      // 1. 取得該筆訂單詳細資訊
      const orders = await sheetService.getOrders();
      const target = orders.find(o => String(o.orderId) === String(orderId));
      if (!target) throw new Error("找不到訂單");

      // 2. 更新 Orders 狀態為「已結單」
      // 注意：此處調用 sheetService.updateOrderWithCheck 以確保一致性
      await sheetService.updateOrderWithCheck(orderId, { status: "已結單" });

      // 3. 自動彙整至 VendorOrders (採購表)
      // 我們直接調用 sheetService 內部的 Google Sheets API 邏輯或建立新方法
      await this.syncToVendorOrders(target);
      
      return { success: true };
    } catch (e) {
      console.error(`❌ [orderService] 結單失敗:`, e.message);
      throw e;
    }
  },

  /** 私有邏輯：彙整採購數量 */
  async syncToVendorOrders(order) {
    // 這裡我們直接操作 sheetService 提供的 sheets 物件或透過 API 呼叫
    // 為了讓您方便複製，這裡假設實作邏輯在 sheetService 中
    return await sheetService.syncToVendorOrders({
      productCode: order.productCode,
      productName: order.productName,
      spec: order.spec,
      qty: order.qty
    });
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
      return await sheetService.updateOrderWithCheck(orderId, updateData);
    } catch (e) {
      console.error(`❌ [orderService] 更新訂單 ${orderId} 失敗:`, e.message);
      throw e;
    }
  },

  /** 刪除訂單 (買家端操作) */
  async deleteOrder(orderId) {
    try {
      return await sheetService.updateOrderWithCheck(orderId, { status: "買家取消" });
    } catch (e) {
      console.error(`❌ [orderService] 刪除訂單 ${orderId} 失敗:`, e.message);
      throw e;
    }
  }
};

export default orderService;