const orderService = require('./orderService');
const productService = require('./productService');
const sheetService = require('./sheetService');

/**
 * 產生廠商訂貨彙總
 */
function buildVendorOrders() {
  const orders = orderService.getAllOrders();
  const map = {};

  for (const o of orders) {
    const product = productService.getProductByCode(o.productCode);
    if (!product) continue;

    const colorName = product.colors?.[o.colorCode] || o.colorCode;
    const key = `${o.productCode}_${colorName}`;

    if (!map[key]) {
      map[key] = {
        productCode: o.productCode,
        productName: product.name,
        color: colorName,
        qty: 0,
      };
    }

    map[key].qty += Number(o.qty);
  }

  return Object.values(map);
}

/**
 * 同步到 Google Sheet（VendorOrders）
 */
async function exportVendorOrders() {
  const list = buildVendorOrders();
  if (!list.length) return { success: false };

  await sheetService.replaceVendorOrders(list);
  return { success: true, count: list.length };
}

module.exports = {
  exportVendorOrders,
};
