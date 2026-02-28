import { google } from 'googleapis';

// 初始化 Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const orderService = {
  /**
   * 取得所有訂單
   */
  async getAllOrders() {
    try {
      console.log(`📊 嘗試讀取 Google Sheet: ${SPREADSHEET_ID}`);
      
      // 讀取 Orders 分頁的 A 到 J 欄
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Orders!A:J', 
      });

      const rows = response.data.values;

      if (!rows || rows.length <= 1) {
        console.log("⚠️ Google Sheet 中沒有找到資料列 (或是只有標題列)");
        return [];
      }

      // 取得標題列並對齊索引
      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log(`✅ 成功讀取到 ${dataRows.length} 筆訂單資料`);

      // 將每一列轉為物件
      return dataRows.map(row => ({
        orderId: row[headers.indexOf('orderId')] || '',
        productName: row[headers.indexOf('productName')] || '未知商品',
        buyerName: row[headers.indexOf('buyerName')] || '匿名',
        qty: row[headers.indexOf('qty')] || 0,
        status: row[headers.indexOf('status')] || 'ordered',
        color: row[headers.indexOf('color')] || '',
        size: row[headers.indexOf('size')] || '',
        createdAt: row[headers.indexOf('createdAt')] || ''
      }));

    } catch (error) {
      console.error("❌ Google Sheet 讀取失敗:", error.message);
      throw new Error("無法從試算表取得資料: " + error.message);
    }
  }
};

export default orderService;