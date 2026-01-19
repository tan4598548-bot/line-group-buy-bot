/**
 * index.js
 * LINE 團購 Bot 主程式（含截止提醒 cron）
 */

require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cron = require('node-cron');

const reminderService = require('./services/reminderService');

console.log('🚀 index.js loaded');
console.log('⏱ Server boot time:', new Date().toISOString());

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'DUMMY',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'DUMMY',
};

const client = new line.Client(config);

// LINE webhook（保持穩定）
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
          text: '✅ Bot 已運行（含截止提醒）',
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
console.log('🕒 Registering deadline reminder cron...');

cron.schedule(
  '0 9 * * *',
  () => {
    console.log('⏰ [CRON] Deadline reminder triggered');
    reminderService.checkDeadlines();
  },
  {
    timezone: 'Asia/Taipei',
  }
);

console.log('✅ Deadline reminder cron scheduled');

// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server is running on port ${PORT}`);
});
