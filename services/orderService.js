import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const orderService = {
  async getAllOrders() {
    try {
      console.log(`📊 正在讀取試算表: ${SPREADSHEET_ID}`);
      
      // 讀取 Orders 分頁的 A 到 M 欄 (對應您圖片中的所有欄位)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Orders!A:M', 
      });

      const rows = response.data.values;

      if (!rows || rows.length <= 1) {
        console.log("⚠️ Orders 分頁目前沒有資料紀錄。");
        return [];
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // 根據您的 Google Sheet 截圖修正欄位映射
      return dataRows.map(row => {
        const getVal = (name) => {
          const index = headers.indexOf(name);
          return (index !== -1 && row[index]) ? row[index] : '';
        };

        return {
          orderId: getVal('order_ID'),       // 對齊圖片標題: order_ID
          productName: getVal('product_name'), // 對齊圖片標題: product_name
          buyerName: getVal('buyer_name'),     // 對齊圖片標題: buyer_name
          qty: getVal('qty') || 0,
          status: getVal('status') || 'ordered',
          color: getVal('color') || '',
          size: getVal('size') || '',
          price: getVal('price') || 0,
          createdAt: getVal('created_at')     // 對齊圖片標題: created_at
        };
      });

    } catch (error) {
      console.error("❌ Google Sheet 讀取失敗:", error.message);
      throw error;
    }
  }
};

export default orderService;