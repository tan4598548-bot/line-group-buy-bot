const sheetService = require('./sheetService');

function parseColorMap(map = '') {
  return map.split(',').map(p => {
    const [code, name] = p.split(':');
    return { code: code.trim(), name: name.trim() };
  });
}

async function getUserOrders(userId) {
  const orders = await sheetService.getSheetData('Orders');
  const products = await sheetService.getSheetData('Products');

  return orders
    .filter(o => o.userId === userId)
    .map(o => {
      const product = products.find(p => p.productCode === o.productCode) || {};
      const colors = parseColorMap(product.colorMap || '');
      const color = colors.find(c => c.code === o.color) || {};

      return {
        productCode: o.productCode,
        productName: product.productName || '',
        colorCode: o.color,
        colorName: color.name || '',
        size: o.size,
        qty: o.qty,
      };
    });
}

module.exports = {
  ...module.exports,
  getUserOrders,
};
