// cron/cronProductReminder.js
import { getActiveProducts, markReminded } from '../services/productService.js';

export function runProductCloseReminder() {
  const now = new Date();

  // 只在 20:00 跑
  if (now.getHours() !== 20) return null;

  const products = getActiveProducts();

  const remindList = products.filter(p => {
    if (p.status !== 'ON') return false;
    if (p._reminded === true) return false;

    const closeAt = new Date(p.closeAt);
    const diff = closeAt - now;

    // 24 小時內
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
  });

  if (remindList.length === 0) return null;

  const message = generateReminderMessage(remindList);
  markReminded(remindList.map(p => p.id));

  return message;
}

function generateReminderMessage(list) {
  const lines = list.map(p => `▪ ${p.name}`).join('\n');

  return `
⏰【結單提醒｜最後一天】

以下商品將於明日結單，尚未下單的請把握👇

${lines}

📌 請至記事本搜尋商品名稱下單
📌 結單後系統將自動鎖單
`.trim();
}
