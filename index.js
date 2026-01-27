/**
 * index.js
 * 最終整合主入口
 * - LINE webhook
 * - LIFF / API（買家 / 版主）
 * - 到貨 / 出貨
 * - cron：商品結單前一天提醒
 */

import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import line from '@line/bot-sdk';

// === 載入環境變數 ===
dotenv.config();

// === LINE 設定 ===
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const lineClient = new line.Client(lineConfig);

// === Services ===
import { handleOrderMessage } from './services/orderService.js';
import { handleArrivedMessage } from './services/arrivedService.js';
import { handleShippingMessage } from './services/shippingService.js';
import { getMyPendingOrders } from './services/queryService.js';

// cron（你剛剛打不到的就是這個）
import { runProductCloseReminder } from './cron/cronProductReminder.js';

// === Express ===
const app = express();
app.use(bodyParser.json());

/* ======================================================
 * 1️⃣ LINE Webhook
 * ====================================================== */
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue;

    const text = event.message.text.trim();
    const replyToken = event.replyToken;
    const userId = event.source.userId;

    let replyText = null;

    try {
      // 下單
      if (text.startsWith('下單')) {
        replyText = await handleOrderMessage(text, event);
      }

      // 到貨
      else if (text.startsWith('到貨')) {
        replyText = await handleArrivedMessage(text);
      }

      // 出貨
      else if (text.startsWith('出貨')) {
        replyText = await handleShippingMessage(text);
      }

      // 查詢（買家）
      else if (text === '查詢') {
        replyText = await getMyPendingOrders(userId);
      }

      if (replyText) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: replyText,
        });
      }
    } catch (err) {
      console.error('Webhook error:', err);
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: '❌ 系統發生錯誤，請稍後再試',
      });
    }
  }

  res.sendStatus(200);
});

/* ======================================================
 * 2️⃣ API：買家查詢（LIFF / 瀏覽器）
 * ====================================================== */
app.get('/api/mypending', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).send('Missing userId');
  }

  const result = await getMyPendingOrders(userId);
  res.send(result);
});

/* ======================================================
 * 3️⃣ Cron：商品結單前一天提醒（20:00）
 * 👉 Render Cron 會打這支
 * ====================================================== */
app.get('/cron/product-close-reminder', (req, res) => {
  const message = runProductCloseReminder();

  if (!message) {
    return res.send('No reminder');
  }

  // 這裡「只回傳文字」，你複製貼群
  res.send(message);
});

/* ======================================================
 * 4️⃣ Server 啟動
 * ====================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
