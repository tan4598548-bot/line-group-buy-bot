import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {
  // 1. 讀取商品
  async getProducts() {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Products!A:M', 
      });
      const rows = response.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const getVal = (name) => {
          const index = headers.indexOf(name);
          return (index !== -1 && row[index]) ? row[index] : '';
        };
        return {
          productCode: getVal('商品代碼'), // A 欄
          productName: getVal('商品名稱'), // B 欄
          price: Number(getVal('單價')) || 0,
          active: getVal('是否上架'),      // E 欄
          closeDate: getVal('結單日'),     // F 欄
          images: getVal('images'),
          type: getVal('type') || 'normal'
        };
      });
    } catch (e) { return []; }
  },

  // 2. 刪除商品邏輯 (關鍵新增)
  async deleteProduct(productCode) {
    try {
      // 先抓取所有資料找出 Row Index
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Products!A:A', // 只要檢查 A 欄商品代碼
      });
      const rows = response.data.values;
      if (!rows) throw new Error("找不到商品表");

      const rowIndex = rows.findIndex(row => row[0] === productCode);
      if (rowIndex === -1) throw new Error("找不到該商品代碼");

      // 取得 Products 分頁的 Sheet ID
      const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetId = sheetMeta.data.sheets.find(s => s.properties.title === 'Products').properties.sheetId;

      // 執行刪除列動作
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      });
      return { ok: true };
    } catch (e) {
      console.error("deleteProduct Error:", e.message);
      throw e;
    }
  },

  // 3. 讀取訂單
  async getOrders() {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Orders!A:M',
      });
      const rows = response.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const getVal = (name) => {
          const index = headers.indexOf(name);
          return (index !== -1 && row[index]) ? row[index] : '';
        };
        return {
          orderId: getVal('order_ID'),
          productName: getVal('product_name'),
          buyerName: getVal('buyer_name'),
          qty: getVal('qty') || 0,
          status: getVal('status')
        };
      });
    } catch (e) { return []; }
  }
};

export default sheetService;