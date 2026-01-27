/**
 * reminderService.js
 * 功能：
 * - 截止前一天自動發群組提醒（只一次）
 * - 截止時間到自動鎖單
 * - 鎖單後自動產生 Google Sheet（Orders / VendorOrders）
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const line = require('@line/bot-sdk');

const lockService = require('./lockService');
const orderService = require('./orderService');
const sheetService = require('./sheetService');

const REMINDED_PATH = path.join(__dirname, 'reminded.json');
const DEADLINE = process.env.ORDER_DEADLINE;

// LINE Push Client
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN
  ? new line.Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    })
  : null;

/**
 * 是否已提醒
 */
function hasReminded() {
  if (!fs.existsSync(REMINDED_PATH)) return false;
  return JSON.parse(fs.readFileSync(REMINDED_PATH, 'utf8')).reminded === true;
}

/**
 * 標記為已提醒
 */
function setReminded() {
  fs.writeFileSync(
    REMINDED_PATH,
    JSON.stringify({ reminded: true }, null, 2)
  );
}

/**
 * 嘗試從 orders.json 取得群組 ID
 */
function getGroupId() {
  const ordersPath = path.join(__dirname, '../data/orders.json');
  if (!fs.existsSync(ordersPath)) return null;

  const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
  if (!orders.length) return null;

  return orders[0].groupId || null;
}

/**
 * 啟動 cron
 */
function start() {
  if (!DEADLINE) {
    console.log('⚠️ 未設定 ORDER_DEADLINE，略過提醒與鎖單');
    return;
  }

  const deadline = new Date(DEADLINE.replace(' ', 'T'));
  if (isNaN(deadline.getTime())) {
    console.log('❌ ORDER_DEADLINE 格式錯誤，請使用 YYYY-MM-DD HH:mm');
    return;
  }

  console.log('⏰ 訂單截止時間：', deadline.toLocaleString());

  /**
   * 🔒 每分鐘檢查 → 到截止時間自動鎖單 + 出表
   */
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    if (now >= deadline && !lockService.isLocked()) {
      lockService.lock();
      console.log('🔒 已到截止時間，自動鎖單完成');

      try {
        const orders = orderService.getAllOrders();
        await sheetService.rebuildOrders(orders);
        await sheetService.rebuildVendorOrders(orders);
        console.log('📊 已自動產生 Orders / VendorOrders Sheet');
      } catch (err) {
        console.error('❌ 鎖單後產生 Sheet 失敗', err.message);
      }
    }
  });

  /**
   * 🔔 截止前一天提醒（只一次）
   */
  const reminderTime = new Date(deadline);
  reminderTime.setDate(reminderTime.getDate() - 1);

  const cronExp = `${reminderTime.getMinutes()} ${reminderTime.getHours()} ${reminderTime.getDate()} ${reminderTime.getMonth() + 1} *`;

  cron.schedule(cronExp, async () => {
    if (hasReminded()) return;

    const groupId = getGroupId();
    if (!groupId || !client) {
      console.log('⚠️ 找不到群組 ID 或 LINE client，略過提醒');
      return;
    }

    try {
      await client.pushMessage(groupId, {
        type: 'text',
        text: '🔔【團購提醒】\n訂單將於明天截止，請把握最後下單時間！'
      });

      setReminded();
      console.log('✅ 已發送截止前一天提醒');
    } catch (err) {
      console.error('❌ 發送提醒失敗', err.message);
    }
  });
}

module.exports = {
  start
};
