/**
 * 驗證訂單內容（基本版）
 */

function validateOrder(order) {
  if (!order.productCode) {
    return { ok: false, error: '❌ 商品代碼錯誤' };
  }

  if (!order.size) {
    return { ok: false, error: '❌ 請填寫尺寸' };
  }

  if (!Array.isArray(order.colors) || order.colors.length === 0) {
    return { ok: false, error: '❌ 請至少選擇一個顏色' };
  }

  return { ok: true };
}

module.exports = {
  validateOrder
};
