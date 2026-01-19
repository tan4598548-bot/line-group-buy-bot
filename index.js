require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

// utils
const { parseOrderText } = require('./utils/parser');
const { validateOrder } = require('./utils/validator');
const messages = require('./utils/messages');

// services
const orderService = require('./services/orderService');
const lockService = require('./services/lockService');
const reminderService = require('./services/reminderService');
const sheetService = require('./services/sheetService');

const app = express();

/**
 * LINE Bot 設定
 */
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'DUMMY',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'DUMMY'
};

const client = process.env.LINE_CHANNEL_ACCESS_TOKEN
  ? new line.Client(config)
  : null;

/**
 * Webhook
 */
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue;

      const text = event.message.text.trim();
      const userId = event.source.userId;
      const replyToken = event.replyToken;

      /* ======================
       * 團主管理指令
       * ====================== */
      if (text === '/export') {
        const orders = orderService.getAllOrders();
        await sheetService.rebuildSummary(orders);
        await safeReply(replyToken, '📦 發貨總表已重新產生完成');
        continue;
      }

      /* ======================
       * 群友下單（+）
       * ====================== */
      if (!text.startsWith('+')) continue;

      // 已鎖單
      if (lockService.isLocked()) {
        await safeReply(replyToken, messages.ORDER_LOCKED);
        continue;
      }

      // 解析
      const parsed = parseOrderText(text);
      if (!parsed.ok) {
        await safeReply(replyToken, parsed.error);
        continue;
      }

      // 組合完整訂單物件（給 orderService）
      const order = {
        userId,
        userName: userId, // 之後可改成 profile name
        productCode: parsed.order.productCode,
        productName: parsed.order.productCode,
        colors: parsed.order.colors,
        size: parsed.order.size,
        quantity: parsed.order.qty
      };

      // 驗證
      const validation = validateOrder(order);
      if (!validation.ok) {
        await safeReply(replyToken, validation.error);
        continue;
      }

      // 寫入 orders.json（顏色拆單）
      const addedOrders = orderService.addOrder(order);

      // 同步寫入 Google Sheet（每一筆）
      for (const o of addedOrders) {
        await sheetService.appendOrder(o);
      }

      // 成功回覆
      await safeReply(
        replyToken,
        messages.ORDER_SUCCESS(parsed.order)
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200);
  }
});

/**
 * 安全回覆（避免 401 / replyToken 過期）
 */
async function safeReply(token, text) {
  if (!client || !token) return;
  try {
    await client.replyMessage(token, {
      type: 'text',
      text
    });
  } catch (e) {
    console.error('Reply failed:', e.message);
  }
}

/**
 * 啟動截止提醒 cron
 */
reminderService.start();

/**
 * Render 啟動
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
