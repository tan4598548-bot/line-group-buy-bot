/**
 * reminderService.js
 * 功能：
 * - 截止前一天自動提醒（只提醒一次）
 */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const remindedPath = path.join(__dirname, 'reminded.json');

// 預設截止日（可之後做成指令）
const DEADLINE = process.env.ORDER_DEADLINE; 
// 格式：2026-02-28

// 提醒時間（每天 10:00）
const CRON_TIME = '0 10 * * *'; 

function hasReminded(dateStr) {
  if (!fs.existsSync(remindedPath)) return false;
  const data = JSON.parse(fs.readFileSync(remindedPath, 'utf8'));
  return data[dateStr] === true;
}

function markReminded(dateStr) {
  let data = {};
  if (fs.existsSync(remindedPath)) {
    data = JSON.parse(fs.readFileSync(remindedPath, 'utf8'));
  }
  data[dateStr] = true;
  fs.writeFileSync(remindedPath, JSON.stringify(data, null, 2));
}

function isOneDayBeforeDeadline(todayStr, deadlineStr) {
  const today = new Date(todayStr);
  const deadline = new Date(deadlineStr);

  const diffDays =
    Math.floor((deadline - today) / (1000 * 60 * 60 * 24));

  return diffDays === 1;
}

/**
 * 啟動截止提醒
 * @param {Function} sendMessageToGroup
 */
function startDeadlineReminder(sendMessageToGroup) {
  if (!DEADLINE) {
    console.warn('⚠️ 未設定 ORDER_DEADLINE，截止提醒未啟動');
    return;
  }

  cron.schedule(CRON_TIME, async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);

      if (!isOneDayBeforeDeadline(todayStr, DEADLINE)) return;
      if (hasReminded(DEADLINE)) return;

      await sendMessageToGroup(
        `⏰ 團購截止提醒\n\n` +
        `⚠️ 明天（${DEADLINE}）為最後下單日\n` +
        `請尚未下單的群友把握時間！`
      );

      markReminded(DEADLINE);
      console.log('✅ 已發送截止前一天提醒');

    } catch (err) {
      console.error('Reminder error:', err);
    }
  });
}

module.exports = {
  startDeadlineReminder
};
