const fs = require('fs');
const path = require('path');

const ordersPath = path.join(__dirname, '../data/orders.json');

function readOrders() {
  if (!fs.existsSync(ordersPath)) return {};
  return JSON.parse(fs.readFileSync(ordersPath));
}

function saveOrders(data) {
  fs.writeFileSync(ordersPath, JSON.stringify(data, null, 2));
}

// 新增訂單（支援多色拆單）
module.exports.addOrder = (userId, order) => {
  const orders = readOrders();

  if (!orders[userId]) {
    orders[userId] = [];
  }

  for (const color of order.colors) {
    orders[userId].push({
      product: order.productCode,
      qty: order.qty,
      color,
      size: order.size
    });
  }

  saveOrders(orders);
};

// 團主用：修改 / 刪除
module.exports.updateOrder = (userId, index, newOrder) => {
  const orders = readOrders();
  if (!orders[userId] || !orders[userId][index]) return false;

  orders[userId][index] = newOrder;
  saveOrders(orders);
  return true;
};

module.exports.deleteOrder = (userId, index) => {
  const orders = readOrders();
  if (!orders[userId] || !orders[userId][index]) return false;

  orders[userId].splice(index, 1);
  saveOrders(orders);
  return true;
};
