const fs = require('fs');
const path = require('path');

const ordersPath = path.join(__dirname, '../data/orders.json');

function readOrders() {
  if (!fs.existsSync(ordersPath)) return [];
  return JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
}

function saveOrders(data) {
  fs.writeFileSync(ordersPath, JSON.stringify(data, null, 2));
}

/**
 * 新增訂單（顏色拆單）
 */
function addOrder(order) {
  const orders = readOrders();

  for (const color of order.colors) {
    orders.push({
      userId: order.userId,
      userName: order.userName,
      productCode: order.productCode,
      productName: order.productName,
      color,
      size: order.size || '',
      quantity: order.quantity,
      time: new Date().toISOString()
    });
  }

  saveOrders(orders);
}

/**
 * 列出所有訂單（附 index）
 */
function listOrders() {
  return readOrders().map((o, i) => ({
    index: i,
    ...o
  }));
}

/**
 * 刪除訂單
 */
function deleteOrder(index) {
  const orders = readOrders();
  if (!orders[index]) return false;
  orders.splice(index, 1);
  saveOrders(orders);
  return true;
}

/**
 * 編輯訂單（整筆覆蓋）
 */
function editOrder(index, newOrder) {
  const orders = readOrders();
  if (!orders[index]) return false;

  orders[index] = {
    ...orders[index],
    ...newOrder
  };
  saveOrders(orders);
  return true;
}

/**
 * 斷貨：移除某商品所有訂單
 */
function removeByProductCode(code) {
  const orders = readOrders();
  const remain = orders.filter(o => o.productCode !== code);
  const removed = orders.length - remain.length;
  saveOrders(remain);
  return removed;
}

function getAllOrders() {
  return readOrders();
}

module.exports = {
  addOrder,
  listOrders,
  deleteOrder,
  editOrder,
  removeByProductCode,
  getAllOrders
};
