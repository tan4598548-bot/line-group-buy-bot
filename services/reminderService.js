const cron = require('node-cron');
const products = require('../config/products');
const fs = require('fs');
const path = require('path');

// 紀錄「已提醒過哪些商品」
const recordPath = path.join(__dirname, '../data/reminded.json');

function readReminded() {
  if (!fs.existsSync(recordPath)) return {};
  return JSON.parse(fs.readFileSync(recordPath));
}

function saveReminded(data) {
  fs.writeFileSync(recordPath, JSON.stringify(data, null, 2));
}

function isTomorrow(dateStr) {
  const today = new Date();
  const target = new Date(dateStr);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = (target - today) / (1000 * 60 * 60 * 24);
  return diff === 1;
}

module.exports.startDeadlineReminder = (client, groupId) => {
  // 每天早上 9 點檢查
  cron.schedule('0 9 * * *', async () => {
    const reminded = readReminded();

    for (const code in products) {
      const product = products[code];

      if (!product.deadline) continue;
      if (!isTomorrow(product.deadline)) continue;
      if (reminded[code]) continue; // 已提醒過

      const message = `⚠️【截止提醒】
商品：${product.name}（${code}）
⏰ 明天（${product.deadline}）截止下單
要買的請把握時間！`;

      try {
        await client.pushMessage(groupId, {
          type: 'text',
          text: message
        });

        reminded[code] = true;
        saveReminded(reminded);
        console.log(`✅ 已發送截止提醒：${code}`);
      } catch (err) {
        console.error('提醒發送失敗', err);
      }
    }
  });
};
