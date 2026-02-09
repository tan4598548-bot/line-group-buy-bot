const products = require('../config/products');

function validateOrder(order) {
  const product = products[order.productCode];
  if (!product) return '❌ 商品代碼不存在';

  if (order.size && product.sizes && !product.sizes.includes(order.size)) {
    return '❌ 尺寸錯誤';
  }

  order.colors.forEach(c => {
    if (product.colors && !product.colors.includes(c)) {
      throw new Error(`❌ 顏色 ${c} 不存在`);
    }
  });

  return {
    productName: product.name,
    price: product.price,
  };
}

module.exports = { validateOrder };
