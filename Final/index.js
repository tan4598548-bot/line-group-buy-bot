const express = require('express');
const line = require('@line/bot-sdk');
const config = require('./config');
const { handleOrder } = require('./parser');
const { handleAdmin } = require('./admin');
const { startReminder } = require('./reminder');

const app = express();
const client = new line.Client(config);

app.post('/webhook', line.middleware(config), async (req, res) => {
  for (const event of req.body.events) {
    if (event.type !== 'message') continue;
    if (event.message.type !== 'text') continue;

    const text = event.message.text.trim();

    // 群友下單
    if (text.startsWith('+')) {
      const result = await handleOrder(text, event, client);
      await client.replyMessage(event.replyToken, { type: 'text', text: result });
    }

    // 團主管理指令
    if (text.startsWith('管理')) {
      const result = await handleAdmin(text, event, client);
      await client.replyMessage(event.replyToken, { type: 'text', text: result });
    }
  }
  res.sendStatus(200);
});

// 啟動截止提醒
startReminder(client);

app.listen(3000, () => console.log('Bot running on port 3000'));
