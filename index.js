/**
 * index.js
 * LINE 團購 Bot 主程式（cron + webhook 安全版）
 */

require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cron = require('node-cron');

const reminderService = require('./services/reminderService');

console.log('🚀 index.js loaded');
console.log('⏱ Boot time:', new Date().toISOString());

const app = express();

const hasLineToken =
  !!process.env.LINE_CHANNEL_ACCESS_TOKEN &&
  !!process.env.LINE_CHANNEL_SECRET;

const config = hasLineToken
  ? {
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
    }
  : null;

const client = hasLineToken ? new line.Client(config) : null;

// =====================
// Webhook（安全模式）
// =====================
app.post(
  '/webhook',
  hasLineToken ? line.middleware(config) : express.json(),
  async (req, res) => {
    try {
      if (!hasLineToken) {
        // 沒有 token → 只回 200，不做任何事
        return res.sendStatus(200);
      }

      const events = req.body.events || [];

      for (const event of events) {
        if (
          event.type === 'message' &&
          event.message.type === 'text' &&
          event.replyToken
        ) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '✅ Bot 運行中',
          });
        }
      }

      res.sendStatus(200);
    } catch (err) {
      console.error('❌ Webhook error:', err);
      res.sendStatus(200);
    }
  }
);

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
