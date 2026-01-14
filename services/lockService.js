const products = require('../config/products');

module.exports.isLocked = (productCode) => {
  const product = products[productCode];
  if (!product || !product.deadline) return false;

  const today = new Date();
  const deadline = new Date(product.deadline);

  today.setHours(0,0,0,0);
  deadline.setHours(0,0,0,0);

  return today > deadline;
};
