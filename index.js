require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const { parseOrderText } = require('./utils/parser');
const { validateOrder } = require('./utils/validator');

const orderService = require('./services/orderService');
const sheetService = require('./services/sheetService');
const lockService = require('./services/lockService');
const { startDeadlineReminder } = require('./services/reminderService');
const { handleOutOfStock } = require('./services/outOfStockService');

const app = express();

/* ---------- LINE ---------- */
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new line.Client(config);

const GROUP_ID = process.env.LINE_GROUP_ID;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',');

async function sendGroup(text) {
  if (!GROUP_ID) return;
  await client.pushMessage(GROUP_ID, { type: 'text', text });
}

/* ---------- 啟動截止提醒（含自動鎖單） ---------- */
startDeadlineReminder(sendGroup);

/* ---------- Webhook ---------- */
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    for (const event of req.body.events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue;

      const text = event.message.text.trim();
      const userId = event.source.userId;
      const isAdmin = ADMIN_IDS.includes(userId);

      /* ===== 團主指令（不受鎖單影響） ===== */

      if (text === '/list' && isAdmin) {
        const list = orderService.listOrders();
        const msg = list.length
          ? list.map(o =>
              `#${o.index} ${o.userName} ${o.productCode} ${o.color} ${o.size} x${o.quantity}`
            ).join('\n')
          : '目前沒有訂單';

        await client.replyMessage(event.replyToken, { type: 'text', text: msg });
        continue;
      }

      if (text.startsWith('/del') && isAdmin) {
        const index = Number(text.split(' ')[1]);
        const ok = orderService.deleteOrder(index);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: ok ? '✅ 已刪除訂單' : '❌ 訂單不存在'
        });
        continue;
      }

      if (text.startsWith('/edit') && isAdmin) {
        const [, indexStr, ...orderText] = text.split(' ');
        const index = Number(indexStr);

        const parsed = parseOrderText(orderText.join(' '));
        const result = validateOrder(parsed);

        if (!result.ok) {
          await client.replyMessage(event.replyToken, { type: 'text', text: result.message });
          continue;
        }

        const ok = orderService.editOrder(index, {
          productCode: result.data.productCode,
          productName: result.data.productName,
          color: result.data.colors[0],
          size: result.data.size,
          quantity: result.data.quantity
        });

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: ok ? '✏️ 已更新訂單' : '❌ 訂單不存在'
        });
        continue;
      }

      if (text.startsWith('/out') && isAdmin) {
        const code = text.split(' ')[1];
        await handleOutOfStock(code, sendGroup);
        continue;
      }

      /* ===== 群友下單（受鎖單影響） ===== */

      if (text.startsWith('+')) {
        if (lockService.isLocked()) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ 團購已截止，無法再下單'
          });
          continue;
        }

        const profile = await client.getProfile(userId);
        const parsed = parseOrderText(text);
        const result = validateOrder(parsed);

        if (!result.ok) {
          await client.replyMessage(event.replyToken, { type: 'text', text: result.message });
          continue;
        }

        orderService.addOrder({
          userId,
          userName: profile.displayName,
          productCode: result.data.productCode,
          productName: result.data.productName,
          colors: result.data.colors,
          size: result.data.size,
          quantity: result.data.quantity
        });

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ ${profile.displayName} 下單成功`
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

/* ---------- 啟動 ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Bot running'));
