const cron = require('node-cron');
const lockService = require('./lockService');

/**
 * 環境變數：
 * ORDER_DEADLINE=2026-01-31 23:59
 */
function startDeadlineReminder(sendGroup) {
  const deadline = process.env.ORDER_DEADLINE;
  if (!deadline) {
    console.warn('⚠️ 未設定 ORDER_DEADLINE');
    return;
  }

  const deadlineTime = new Date(deadline);

  // 每分鐘檢查一次
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    if (now >= deadlineTime && !lockService.isLocked()) {
      lockService.lock();

      await sendGroup(
        `🔒 團購已截止\n\n` +
        `目前時間已超過截止時間\n` +
        `❌ 系統已鎖單，無法再下單`
      );

      console.log('🔒 Order locked');
    }
  });
}

module.exports = {
  startDeadlineReminder
};
