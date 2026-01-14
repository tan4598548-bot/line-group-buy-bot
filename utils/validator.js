const products = require('../config/products');
const { isLocked } = require('../services/lockService');
const messages = require('./messages');

module.exports.validateOrder = (order) => {
  const { productCode, qty, colors, size } = order;

  const product = products[productCode];
  if (!product) {
    return { valid: false, message: messages.PRODUCT_NOT_FOUND };
  }

  if (isLocked(productCode)) {
    return { valid: false, message: messages.ORDER_LOCKED };
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    return { valid: false, message: messages.INVALID_QTY };
  }

  if (product.colors && product.colors.length > 0) {
    for (const color of colors) {
      if (!product.colors.includes(color)) {
        return { valid: false, message: messages.INVALID_COLOR };
      }
    }
  }

  if (product.sizes && product.sizes.length > 0) {
    if (!product.sizes.includes(size)) {
      return { valid: false, message: messages.INVALID_SIZE };
    }
  }

  return { valid: true };
};
