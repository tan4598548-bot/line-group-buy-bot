import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {
  /**
   * 1. 讀取商品列表 (對應 Products 分頁)
   */
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
          colorMap: getVal('顏色對照'),    // C 欄
          price: Number(getVal('單價')) || 0, // D 欄
          active: getVal('是否上架'),      // E 欄
          closeDate: getVal('結單日'),     // F 欄
          images: getVal('images'),        // I 欄
          type: getVal('type') || 'normal' // L 欄
        };
      });
    } catch (e) {
      console.error("getProducts Error:", e.message);
      return [];
    }
  },

  /**
   * 2. 寫入新商品 (對應 Products 分頁)
   */
  async appendProduct(data) {
    try {
      const rowValue = [
        data.productCode,   // A: 商品代碼
        data.productName,   // B: 商品名稱
        data.colorMap,      // C: 顏色對照
        data.price,         // D: 單價
        'TRUE',             // E: 是否上架
        data.closeDate,     // F: 結單日
        '',                 // G: 已提醒
        data.detailText,    // H: detailText
        data.images,        // I: images
        data.youtube,       // J: youtube
        data.video,         // K: video
        data.type,          // L: type
        data.totalStock     // M: total_stock
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Products!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValue] },
      });
      return { ok: true };
    } catch (e) {
      throw new Error("寫入商品失敗: " + e.message);
    }
  },

  /**
   * 3. 讀取訂單列表 (對應 Orders 分頁)
   */
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
          orderId: getVal('order_ID'),       // A 欄
          productCode: getVal('product_code'), // B 欄
          productName: getVal('product_name'), // C 欄
          lineId: getVal('line_id'),           // D 欄
          buyerName: getVal('buyer_name'),     // E 欄
          color: getVal('color'),              // F 欄
          size: getVal('size'),                // G 欄
          qty: Number(getVal('qty')) || 0,     // H 欄
          price: Number(getVal('price')) || 0, // I 欄
          status: getVal('status'),            // J 欄
          createdAt: getVal('created_at')      // L 欄
        };
      });
    } catch (e) {
      console.error("getOrders Error:", e.message);
      return [];
    }
  }
};

export default sheetService;