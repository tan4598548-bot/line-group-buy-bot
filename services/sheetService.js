import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {
  // 讀取商品
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
          productCode: getVal('商品代碼'),
          productName: getVal('商品名稱'),
          price: Number(getVal('單價')) || 0,
          active: getVal('是否上架'),
          images: getVal('images'),
          type: getVal('type') || 'normal'
        };
      });
    } catch (e) {
      console.error("getProducts Error:", e.message);
      return [];
    }
  },

  // 讀取訂單
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
          productCode: getVal('product_code'),
          productName: getVal('product_name'),
          buyerName: getVal('buyer_name'),
          qty: getVal('qty') || 0,
          status: getVal('status')
        };
      });
    } catch (e) {
      console.error("getOrders Error:", e.message);
      return [];
    }
  }
};
export default sheetService;