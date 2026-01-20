/**
 * reminderService.js
 * 功能：
 * - 截止前一天自動發群組提醒（只一次）
 * - 截止時間到自動鎖單
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const lockService = require('./lockService');
const line = require('@line/bot-sdk');

const REMINDED_PATH = path.join(__dirname, 'reminded.json');
const DEADLINE = process.env.ORDER_DEADLINE;

// LINE client（用 push）
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN
  ? new line.Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    })
  : null;

/**
 * 讀取是否已提醒
 */
function hasReminded() {
  if (!fs.existsSync(REMINDED_PATH)) return false;
  return JSON.parse(fs.readFileSync(REINDED_PATH, 'utf8')).reminded;
}

/**
 * 設定已提醒
 */
function setReminded() {
  fs.writeFileSync(
    REMINDED_PATH,
    JSON.stringify({ reminded: true }, null, 2)
  );
}

/**
 * 取得群組 ID（從 orders.json 找）
 */
function getGroupId() {
  const ordersPath = path.join(__dirname, '../data/orders.json');
  if (!fs.existsSync(ordersPath)) return null;

  const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
  if (!orders.length) return null;

  return orders[0].groupId || null;
}

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
   * 每分鐘檢查 → 截止即鎖單
   */
  cron.schedule('* * * * *', () => {
    const now = new Date();

    if (now >= deadline && !lockService.isLocked()) {
      lockService.lock();
      console.log('🔒 已到截止時間，自動鎖單完成');
    }
  });

  /**
   * 截止前一天 09:00 提醒（只一次）
   */
  const reminderTime = new Date(deadline);
  reminderTime.setDate(reminderTime.getDate() - 1);
  const minute = reminderTime.getMinutes();
  const hour = reminderTime.getHours();
  const day = reminderTime.getDate();
  const month = reminderTime.getMonth() + 1;

  cron.schedule(`${minute} ${hour} ${day} ${month} *`, async () => {
    if (hasReminded()) return;

    const groupId = getGroupId();
    if (!groupId || !client) {
      console.log('⚠️ 找不到群組 ID，無法發提醒');
      return;
    }

    try {
      await client.pushMessage(groupId, {
        type: 'text',
        text: '🔔【團購提醒】\n訂單將於明天截止，請把握最後下單時間！'
      });

      setReminded();
      console.log('✅ 已發送截止前一天群組提醒');
    } catch (err) {
      console.error('❌ 發送提醒失敗', err.message);
    }
  });
}

module.exports = {
  start
};
