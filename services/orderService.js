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
      
      // 讀取 Orders 分頁的 A 到 K 欄 (對應您圖片中的 11 個欄位)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Orders!A:K', 
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
        // 建立一個尋找索引的輔助工具，避免找不到標題報錯
        const getVal = (name) => {
          const index = headers.indexOf(name);
          return index !== -1 ? row[index] : '';
        };

        return {
          orderId: getVal('order_ID'),       // 修正：對齊圖片中的 order_ID
          productName: getVal('product_name'), // 修正：對齊圖片中的 product_name
          buyerName: getVal('buyer_name'),     // 修正：對齊圖片中的 buyer_name
          qty: getVal('qty') || 0,
          status: getVal('status') || 'ordered',
          color: getVal('color') || '',
          size: getVal('size') || '',
          createdAt: getVal('created_at')     // 修正：對齊圖片中的 created_at
        };
      });

    } catch (error) {
      console.error("❌ Google Sheet 讀取失敗:", error.message);
      throw error;
    }
  }
};

export default orderService;