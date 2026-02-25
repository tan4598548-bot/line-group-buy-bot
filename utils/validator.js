import productService from '../services/productService.js';

export async function validateOrder(order) {
  const products = await productService.listProducts();
  const product = products.find(p => p.productCode === order.productCode);

  if (!product) return { valid: false, message: '❌ 商品代碼不存在' };
  if (!product.active) return { valid: false, message: '❌ 商品已關單' };

  // 如果有定義顏色範圍 (colorMap 欄位)
  if (product.colorMap) {
    const allowed = product.colorMap.toUpperCase();
    for (let c of order.colors) {
      if (!allowed.includes(c)) {
        return { valid: false, message: `❌ 規格 ${c} 不存在` };
      }
    }
  }

  return {
    valid: true,
    productName: product.productName,
    price: product.price
  };
}

export default { validateOrder };