/**
 * reminderService.js
 * 功能：
 * - 截止前一天提醒
 * - 截止時間到自動鎖單
 */

const cron = require('node-cron');
const lockService = require('./lockService');

const DEADLINE = process.env.ORDER_DEADLINE;

function start() {
  if (!DEADLINE) {
    console.log('⚠️ 未設定 ORDER_DEADLINE，略過提醒與鎖單');
    return;
  }

  const deadline = new Date(DEADLINE.replace(' ', 'T'));
  if (isNaN(deadline.getTime())) {
    console.log('❌ ORDER_DEADLINE 格式錯誤');
    return;
  }

  console.log('⏰ 訂單截止時間：', deadline.toLocaleString());

  /**
   * 每分鐘檢查一次是否到截止時間
   */
  cron.schedule('* * * * *', () => {
    const now = new Date();

    // 到截止時間 → 自動鎖單
    if (now >= deadline && !lockService.isLocked()) {
      lockService.lock();
      console.log('✅ 已到截止時間，自動鎖單完成');
    }
  });

  /**
   * 截止前一天 09:00 提醒（只 log，之後可接 push）
   */
  const reminderTime = new Date(deadline);
  reminderTime.setDate(reminderTime.getDate() - 1);

  cron.schedule(
    `${reminderTime.getMinutes()} ${reminderTime.getHours()} ${reminderTime.getDate()} ${reminderTime.getMonth() + 1} *`,
    () => {
      console.log('🔔 截止前一天提醒：訂單即將截止');
    }
  );
}

module.exports = {
  start
};
