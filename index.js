require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const { parseOrderText } = require('./utils/parser');
const { validateOrder } = require('./utils/validator');
const orderService = require('./services/orderService');
const sheetService = require('./services/sheetService');

const app = express();

/* ---------- LINE Bot 設定 ---------- */
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

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
        try {
          const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',');
          if (!ADMIN_IDS.includes(event.source.userId)) {
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '❌ 此指令僅限團主使用'
            });
            continue;
          }

          const orders = orderService.getAllOrders();
          if (!orders || orders.length === 0) {
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
        } catch (err) {
          console.error('Export error:', err);
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ 匯出失敗，請查看系統紀錄'
          });
          continue;
        }
      }

      /* ====== 群友下單（+ 開頭） ====== */
      if (!userText.startsWith('+')) continue;

      // 1️⃣ 解析
      const parsed = parseOrderText(userText);

      // 2️⃣ 驗證
      const result = validateOrder(parsed);
      if (!result.ok) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: result.message
        });
        continue;
      }

      // 3️⃣ 建立訂單
      const order = {
        userId: event.source.userId,
        userName: '群友',
        productCode: result.data.productCode,
        productName: result.data.productName,
        colors: result.data.colors,
        size: result.data.size,
        quantity: result.data.quantity
      };

      // 4️⃣ 寫入 orders.json
      orderService.addOrder(order);

      // 5️⃣ 回覆成功
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
