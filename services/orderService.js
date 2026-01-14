/**
 * orderService.js
 * 唯一訂單資料來源（orders.json）
 * - 群友下單（多色拆單）
 * - 團主修改 / 刪除
 */

const fs = require('fs');
const path = require('path');

const ordersPath = path.join(__dirname, '../data/orders.json');

/* ------------------ 基礎讀寫 ------------------ */

function readOrders() {
  if (!fs.existsSync(ordersPath)) return [];
  return JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
}

function saveOrders(data) {
  fs.writeFileSync(ordersPath, JSON.stringify(data, null, 2), 'utf8');
}

/* ------------------ 新增訂單 ------------------ */
/**
 * order = {
 *   userId,
 *   userName,
 *   productCode,
 *   productName,
 *   colors: ['BK','WH'],
 *   size,
 *   quantity
 * }
 */
function addOrder(order) {
  const orders = readOrders();
  const time = new Date().toISOString();

  // 多色拆單
  order.colors.forEach(color => {
    orders.push({
      userId: order.userId,
      userName: order.userName,
      productCode: order.productCode,
      productName: order.productName,
      color,
      size: order.size || '',
      quantity: order.quantity,
      time
    });
  });

  saveOrders(orders);
}

/* ------------------ 團主管理 ------------------ */

// 取得所有訂單（for export / summary）
function getAllOrders() {
  return readOrders();
}

// 修改某一筆（團主用 index）
function updateOrder(index, newOrder) {
  const orders = readOrders();
  if (!orders[index]) return false;

  orders[index] = {
    ...orders[index],
    ...newOrder
  };

  saveOrders(orders);
  return true;
}

// 刪除某一筆（團主用 index）
function deleteOrder(index) {
  const orders = readOrders();
  if (!orders[index]) return false;

  orders.splice(index, 1);
  saveOrders(orders);
  return true;
}

module.exports = {
  addOrder,
  getAllOrders,
  updateOrder,
  deleteOrder
};
