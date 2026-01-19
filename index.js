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
const outOfStockService = require('./services/outOfStockService');

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

      // 列出所有訂單
      if (text === '/list') {
        const orders = orderService.listOrders();
        if (orders.length === 0) {
          await safeReply(replyToken, '📭 目前沒有任何訂單');
        } else {
          const msg = orders
            .map(
              o =>
                `#${o.index} ${o.productCode} ${o.color} ${o.size} x${o.quantity} (${o.userName})`
            )
            .join('\n');
          await safeReply(replyToken, msg);
        }
        continue;
      }

      // 刪除訂單
      if (text.startsWith('/delete ')) {
        const index = Number(text.split(' ')[1]);
        const ok = orderService.deleteOrder(index);
        await safeReply(
          replyToken,
          ok ? '🗑️ 訂單已刪除' : '❌ 訂單不存在'
        );
        continue;
      }

      // 編輯訂單
      if (text.startsWith('/edit ')) {
        const parts = text.split(' ');
        if (parts.length < 6) {
          await safeReply(replyToken, '❌ 格式：/edit index 商品 數量 顏色 尺寸');
          continue;
        }

        const index = Number(parts[1]);
        const parsed = parseOrderText(`+ ${parts.slice(2).join(' ')}`);
        if (!parsed.ok) {
          await safeReply(replyToken, parsed.error);
          continue;
        }

        const newOrder = {
          productCode: parsed.order.productCode,
          productName: parsed.order.productCode,
          color: parsed.order.colors[0],
          size: parsed.order.size,
          quantity: parsed.order.qty
        };

        const ok = orderService.editOrder(index, newOrder);
        await safeReply(
          replyToken,
          ok ? '✏️ 訂單已更新' : '❌ 訂單不存在'
        );
        continue;
      }

      // 斷貨
      if (text.startsWith('/out ')) {
        const code = text.split(' ')[1];
        const result = outOfStockService.handleOutOfStock(code);

        await safeReply(
          replyToken,
          `🚫 商品 ${code} 已斷貨\n已取消 ${result.removed} 筆訂單`
        );

        // 通知群友
        for (const uid of result.affectedUsers) {
          try {
            await client.pushMessage(uid, {
              type: 'text',
              text: `⚠️ 商品 ${code} 已斷貨，您的訂單已自動取消`
            });
          } catch (e) {
            console.error('Push failed:', uid);
          }
        }
        continue;
      }

      // 匯出發貨總表
      if (text === '/export') {
        const orders = orderService.getAllOrders();
        await sheetService.rebuildSummary(orders);
        await safeReply(replyToken, '📦 發貨總表已重新產生完成');
        continue;
      }

      /* ======================
       * 群友下單
       * ====================== */

      if (!text.startsWith('+')) continue;

      if (lockService.isLocked()) {
        await safeReply(replyToken, messages.ORDER_LOCKED);
        continue;
      }

      const parsed = parseOrderText(text);
      if (!parsed.ok) {
        await safeReply(replyToken, parsed.error);
        continue;
      }

      const order = {
        userId,
        userName: userId,
        productCode: parsed.order.productCode,
        productName: parsed.order.productCode,
        colors: parsed.order.colors,
        size: parsed.order.size,
        quantity: parsed.order.qty
      };

      const validation = validateOrder(order);
      if (!validation.ok) {
        await safeReply(replyToken, validation.error);
        continue;
      }

      const addedOrders = orderService.addOrder(order);

      // 同步寫入 Google Sheet
      for (const o of addedOrders) {
        await sheetService.appendOrder(o);
      }

      await safeReply(replyToken, messages.ORDER_SUCCESS(parsed.order));
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200);
  }
});

/**
 * 安全回覆
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
 * 啟動截止提醒
 */
reminderService.start();

/**
 * Render 啟動
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
