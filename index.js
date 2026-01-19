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

// roles
const roles = require('./config/roles');

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
 * 是否團主
 */
function isAdmin(userId) {
  return roles.admins.includes(userId);
}

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
       * 團主管理指令（需權限）
       * ====================== */

      if (text.startsWith('/')) {
        if (!isAdmin(userId)) {
          await safeReply(replyToken, '⛔ 此指令僅限團主使用');
          continue;
        }

        if (text === '/list') {
          const orders = orderService.listOrders();
          if (orders.length === 0) {
            await safeReply(replyToken, '📭 目前沒有任何訂單');
          } else {
            const msg = orders
              .map(
                o =>
                  `#${o.index} ${o.productCode} ${o.color} ${o.size} x${o.quantity}（${o.userName}）`
              )
              .join('\n');
            await safeReply(replyToken, msg);
          }
          continue;
        }

        if (text.startsWith('/delete ')) {
          const index = Number(text.split(' ')[1]);
          const ok = orderService.deleteOrder(index);
          await safeReply(
            replyToken,
            ok ? '🗑️ 訂單已刪除' : '❌ 訂單不存在'
          );
          continue;
        }

        if (text.startsWith('/out ')) {
          const code = text.split(' ')[1];
          const result = outOfStockService.handleOutOfStock(code);

          await safeReply(
            replyToken,
            `🚫 商品 ${code} 已斷貨\n已取消 ${result.removed} 筆訂單`
          );

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

        if (text === '/export') {
          const orders = orderService.getAllOrders();
          await sheetService.rebuildSummary(orders);
          await safeReply(replyToken, '📦 發貨總表已重新產生完成');
          continue;
        }

        await safeReply(replyToken, '❓ 未知的管理指令');
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

      // 抓 LINE 顯示名稱
      let userName = '未知';
      try {
        const profile = await client.getProfile(userId);
        userName = profile.displayName;
      } catch (e) {
        console.error('Get profile failed:', e.message);
      }

      const order = {
        userId,
        userName,
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
