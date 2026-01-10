require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

app.post('/webhook', line.middleware(config), (req, res) => {
  res.sendStatus(200);

  req.body.events.forEach(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: '✅ Bot 已成功連線（Render）'
      });
    }
  });
});

// ⭐ Render 需要用 process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
