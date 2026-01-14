require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const { parseOrderText } = require('./utils/parser');
const { validateOrder } = require('./utils/validator');
const orderService = require('./services/orderService');
const sheetService = require('./services/sheetService');
const { startDeadlineReminder } = require('./services/reminderService');

const app = express();

/* ---------- LINE Bot 設定 ---------- */
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

/* ---------- 群組推播工具 ---------- */
const GROUP_ID = process.env.LINE_GROUP_ID;

async function sendMessageToGroup(text) {
  if (!GROUP_ID) {
    console.warn('⚠️ 未設定 LINE_GROUP_ID，無法推播群組');
    return;
  }

  await client.pushMessage(GROUP_ID, {
    type: 'text',
    text
  });
}

/* ---------- 啟動截止提醒 ---------- */
startDeadlineReminder(sendMessageToGroup);

/* ---------- Webhook ---------- */
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      if (
        event.type !== 'message' ||
        event.message.type !== 'text' ||
        !event.replyToken
      ) continue;

      const userText = event.message.text.trim();

      /* ====== 團主指令：/export ====== */
      if (userText === '/export') {
        const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',');
        if (!ADMIN_IDS.includes(event.source.userId)) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ 此指令僅限團主使用'
          });
          continue;
        }

        const orders = orderService.getAllOrders();
        if (!orders.length) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '⚠️ 目前沒有任何訂單'
          });
          continue;
        }

        await sheetService.rebuildSummary(orders);

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '📊 發貨總表已更新完成'
        });
        continue;
      }

      /* ====== 群友下單 ====== */
      if (!userText.startsWith('+')) continue;

      const parsed = parseOrderText(userText);
      const result = validateOrder(parsed);

      if (!result.ok) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: result.message
        });
        continue;
      }

      const order = {
        userId: event.source.userId,
        userName: '群友',
        productCode: result.data.productCode,
        productName: result.data.productName,
        colors: result.data.colors,
        size: result.data.size,
        quantity: result.data.quantity
      };

      orderService.addOrder(order);

      await client.replyMessage(event.replyToken, {
        type: 'text',
        text:
          `✅ 訂購成功\n` +
          `商品：${order.productName}（${order.productCode}）\n` +
          `顏色：${order.colors.join(', ')}${order.size ? ' / 尺寸 ' + order.size : ''}\n` +
          `數量：${order.quantity}`
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200);
  }
});

/* ---------- 啟動伺服器 ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 LINE Bot running on port ${PORT}`);
});
