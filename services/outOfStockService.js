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

module.exports.handleOutOfStock = async (client, productCode) => {
  const orders = readOrders();
  const notifiedUsers = [];

  for (const userId in orders) {
    const userOrders = orders[userId];
    const remaining = userOrders.filter(o => o.product !== productCode);

    if (remaining.length !== userOrders.length) {
      // 有訂到該商品
      try {
        await client.pushMessage(userId, {
          type: 'text',
          text: `❌【斷貨通知】
您訂購的商品 ${productCode} 已斷貨
該筆訂單已自動取消，造成不便敬請見諒`
        });
        notifiedUsers.push(userId);
      } catch (err) {
        console.error('通知失敗', userId);
      }

      orders[userId] = remaining;
    }
  }

  saveOrders(orders);
  return notifiedUsers.length;
};
