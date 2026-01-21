require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cron = require('node-cron');

const orderService = require('./services/orderService');
const reminderService = require('./services/reminderService');
const vendorSheetService = require('./services/vendorSheetService');

const { parseOrderText } = require('./utils/parser');
const { validateOrder } = require('./utils/validator');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

/**
 * 🔔 截止前一天自動提醒
 */
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Cron: deadline reminder check');
  await reminderService.sendDeadlineReminders(client);
});

/**
 * 📩 LINE Webhook
 */
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue;

      const text = event.message.text.trim();
      const userId = event.source.userId;
      const userName = event.source.profile?.displayName || '群友';

      /** =====================
       * 👤 群友功能
       * ===================== */

      if (text === '我的訂單') {
        const orders = orderService
          .getAllOrders()
          .filter(o => o.userId === userId);

        if (orders.length === 0) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '目前沒有未到貨的訂單'
          });
          continue;
        }

        const msg = orders.map(
          (o, i) =>
            `${i + 1}. ${o.productName} ${o.color || ''} ${o.size || ''} x${o.quantity}`
        ).join('\n');

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `🧾 你的未到貨訂單：\n\n${msg}`
        });
        continue;
      }

      /** =====================
       * 🛒 群友下單
       * ===================== */
      const parsed = parseOrderText(text);
      if (parsed) {
        const check = validateOrder(parsed);
        if (!check.ok) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `❌ ${check.message}`
          });
          continue;
        }

        orderService.addOrder({
          ...parsed,
          userId,
          userName
        });

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ 已收到訂單：\n${parsed.productName} x${parsed.quantity}`
        });
        continue;
      }

      /** =====================
       * 👑 團主功能
       * ===================== */
      if (text === '結單') {
        const orders = orderService.getAllOrders();

        await vendorSheetService.buildVendorOrders(orders);

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '📦 已結單\n✅ 已產生「廠商訂貨表」'
        });
        continue;
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
