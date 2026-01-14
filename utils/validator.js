/**
 * validator.js
 * 功能：驗證下單是否符合商品定義
 */

const products = require('../config/products');

function validateOrder(parsed) {
  if (!parsed) {
    return { ok: false, message: '❌ 下單格式錯誤，請使用：+ A01 2 BK M' };
  }

  const product = products[parsed.productCode];

  if (!product) {
    return { ok: false, message: `❌ 查無商品代碼 ${parsed.productCode}` };
  }

  // 驗證顏色
  if (product.colors && product.colors.length > 0) {
    for (const c of parsed.colors) {
      if (!product.colors.includes(c)) {
        return {
          ok: false,
          message: `❌ 顏色代碼錯誤：${c}\n可選顏色：${product.colors.join(', ')}`
        };
      }
    }
  }

  // 驗證尺寸（有定義才驗）
  if (product.sizes && product.sizes.length > 0) {
    if (!parsed.size) {
      return {
        ok: false,
        message: `❌ 請輸入尺寸\n可選尺寸：${product.sizes.join(', ')}`
      };
    }

    if (!product.sizes.includes(parsed.size)) {
      return {
        ok: false,
        message: `❌ 尺寸錯誤：${parsed.size}\n可選尺寸：${product.sizes.join(', ')}`
      };
    }
  }

  return {
    ok: true,
    data: {
      productCode: parsed.productCode,
      productName: product.name,
      quantity: parsed.quantity,
      colors: parsed.colors,
      size: parsed.size
    }
  };
}

module.exports = {
  validateOrder
};
