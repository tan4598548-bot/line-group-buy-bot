require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      // 只處理「可回覆的文字訊息」
      if (
        event.type === 'message' &&
        event.message.type === 'text' &&
        event.replyToken
      ) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '✅ Bot 已成功連線（Render）'
        });
      }
    }

    // ⚠️ 一定最後才回 200
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200); // 就算錯，也回 200 給 LINE
  }
});


