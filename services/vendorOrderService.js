/**
 * vendorOrderService.js
 * 功能：
 * - 鎖單後，自動彙總廠商訂貨表
 * - 寫入 Google Sheet（VendorOrders）
 */

const sheetService = require('./sheetService');
const orderService = require('./orderService');

/**
 * 依 商品 / 顏色 / 尺寸 彙總數量
 */
function buildVendorOrders() {
  const orders = orderService.getAllOrders();

  const map = {};

  orders.forEach(o => {
    const key = `${o.productCode}|${o.productName}|${o.color}|${o.size}`;
    if (!map[key]) {
      map[key] = {
        productCode: o.productCode,
        productName: o.productName,
        color: o.color,
        size: o.size,
        quantity: 0
      };
    }
    map[key].quantity += o.quantity;
  });

  return Object.values(map);
}

/**
 * 寫入 Google Sheet
 */
async function exportVendorOrders() {
  const rows = buildVendorOrders();
  if (!rows.length) return;

  await sheetService.writeVendorOrders(rows);
}

module.exports = {
  exportVendorOrders
};
