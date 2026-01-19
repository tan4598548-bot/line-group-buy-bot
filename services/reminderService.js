/**
 * reminderService.js
 * 功能：截止前一天提醒（每天由 cron 呼叫）
 */

const fs = require('fs');
const path = require('path');
const products = require('../config/products');

const remindedPath = path.join(__dirname, 'reminded.json');

function readReminded() {
  if (!fs.existsSync(remindedPath)) return {};
  return JSON.parse(fs.readFileSync(remindedPath));
}

function saveReminded(data) {
  fs.writeFileSync(remindedPath, JSON.stringify(data, null, 2));
}

function isTomorrow(dateStr) {
  const today = new Date();
  const target = new Date(dateStr);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return (
    target.getFullYear() === tomorrow.getFullYear() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getDate() === tomorrow.getDate()
  );
}

/**
 * 🔔 主入口：檢查所有商品截止日
 */
function checkDeadlines() {
  console.log('🔍 [Reminder] Checking deadlines...');

  const reminded = readReminded();
  let changed = false;

  Object.values(products).forEach(product => {
    if (!product.deadline) return;

    if (isTomorrow(product.deadline)) {
      if (reminded[product.code]) {
        return; // 已提醒過
      }

      console.log(
        `📣 [REMIND] 商品「${product.name}」將於 ${product.deadline} 截止`
      );

      // 標記已提醒
      reminded[product.code] = {
        remindedAt: new Date().toISOString(),
      };
      changed = true;
    }
  });

  if (changed) {
    saveReminded(reminded);
  }

  console.log('✅ [Reminder] Check finished');
}

module.exports = {
  checkDeadlines,
};
