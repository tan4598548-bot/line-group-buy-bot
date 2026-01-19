/**
 * index.js
 * LINE 團購 Bot 主程式（Render 專用穩定版）
 */

require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cron = require('node-cron');

// =====================
// 基本啟動確認（超重要）
// =====================
console.log('🚀 index.js loaded');
console.log('⏱ Server boot time:', new Date().toISOString());

// =====================
// Express & LINE 設定
// =====================
const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'DUMMY',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'DUMMY',
};

const client = new line.Client(config);

// =====================
// Webhook（LINE 驗證用）
// =====================
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      if (
        event.type === 'message' &&
        event.message.type === 'text' &&
        event.replyToken
      ) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '✅ Bot 已成功連線（含 cron）',
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.sendStatus(200);
  }
});

// =====================
// 🔔 截止提醒 cron（每天 09:00）
// =====================
console.log('🕒 Registering cron job...');

cron.schedule(
  '0 9 * * *', // 每天 09:00
  () => {
    console.log('⏰ [CRON] Checking order deadlines...');
    console.log('📅 Cron run time:', new Date().toISOString());

    // 之後會在這裡接：
    // reminderService.checkDeadlines()
  },
  {
    timezone: 'Asia/Taipei',
  }
);

console.log('✅ Deadline reminder cron scheduled');

// =====================
// Render 啟動監聽（一定要最後）
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server is running on port ${PORT}`);
});
