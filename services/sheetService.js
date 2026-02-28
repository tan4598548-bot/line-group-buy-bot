import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {
  // 讀取商品列表
  async getProducts() {
    try {
      const response = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Products!A:M' 
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
          closeDate: getVal('結單日'),
          type: getVal('type') || 'normal'
        };
      });
    } catch (e) { return []; }
  },

  // 刪除商品邏輯
  async deleteProduct(productCode) {
    try {
      const response = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Products!A:A' 
      });
      const rows = response.data.values;
      const rowIndex = rows.findIndex(row => row[0] === productCode);
      if (rowIndex === -1) throw new Error("找不到商品");

      const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetId = sheetMeta.data.sheets.find(s => s.properties.title === 'Products').properties.sheetId;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: { sheetId: sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 }
            }
          }]
        }
      });
      return { ok: true };
    } catch (e) { throw e; }
  },

  // 寫入商品 (確保對應 A-M 欄位)
  async appendProduct(data) {
    // 欄位順序: 商品代碼(A), 商品名稱(B), 顏色對照(C), 單價(D), 是否上架(E), 結單日(F), ...
    const rowValue = [
      data.productCode,   // A
      data.productName,   // B
      data.colorMap,      // C
      data.price,         // D
      'TRUE',             // E (預設上架)
      data.closeDate,     // F
      'FALSE',            // G (已提醒)
      '訂單查詢',          // H (detailText)
      '',                 // I (images)
      '',                 // J (youtube)
      '',                 // K (video)
      data.type,          // L (type)
      ''                  // M (total_stock)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Products!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowValue] },
    });
  },

  // 讀取訂單列表
  async getOrders() {
    try {
      const response = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Orders!A:M' 
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
          qty: getVal('qty'), 
          status: getVal('status') 
        };
      });
    } catch (e) { return []; }
  }
};
export default sheetService;