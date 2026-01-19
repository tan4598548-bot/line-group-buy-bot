require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const { parseOrderText } = require('./utils/parser');
const { validateOrder } = require('./utils/validator');
const messages = require('./utils/messages');

const lockService = require('./services/lockService');
const reminderService = require('./services/reminderService');
const orderService = require('./services/orderService');

const app = express();

/**
 * LINE 設定（Render 環境 OK）
 */
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'DUMMY',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'DUMMY'
};

let client = null;
if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  client = new line.Client(config);
}

app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue;

      const userId = event.source.userId;
      const text = event.message.text.trim();

      // 只處理 + 開頭的下單
      if (!text.startsWith('+')) continue;

      // 🔒 已鎖單
      if (lockService.isLocked()) {
        await safeReply(event.replyToken, messages.ORDER_LOCKED);
        continue;
      }

      // 解析
      const parsed = parseOrderText(text);
      if (!parsed.ok) {
        await safeReply(event.replyToken, parsed.error);
        continue;
      }

      // 驗證
      const validation = validateOrder(parsed.order);
      if (!validation.ok) {
        await safeReply(event.replyToken, validation.error);
        continue;
      }

      // 存訂單
      orderService.addOrder(userId, parsed.order);

      await safeReply(
        event.replyToken,
        messages.ORDER_SUCCESS(parsed.order)
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200);
  }
});

async function safeReply(replyToken, text) {
  if (!client || !replyToken) return;
  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text
    });
  } catch (e) {
    console.error('Reply failed:', e.message);
  }
}

// 🚀 啟動 cron
reminderService.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
