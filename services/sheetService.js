import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {
  // 1. 獲取商品列表
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
          closeDate: getVal('結單日'),
          type: getVal('type') || 'normal'
        };
      });
    } catch (e) { return []; }
  },

  // 2. 完整進階寫入邏輯
  async appendProduct(data) {
    try {
      // 組合顏色與尺寸為單一規格字串
      const fullSpecs = `顏色:${data.colorMap} | 尺寸:${data.sizeMap}`;
      
      const rowValue = [
        data.productCode,   // A: 商品代碼
        data.productName,   // B: 商品名稱
        fullSpecs,          // C: 規格對照 (整合顏色與尺寸)
        data.price,         // D: 單價
        'TRUE',             // E: 是否上架
        data.closeDate,     // F: 結單日
        'FALSE',            // G: 已提醒
        `成本:${data.cost}`, // H: detailText (將成本存入描述區備註)
        data.images,        // I: images
        '',                 // J: youtube
        '',                 // K: video
        data.type,          // L: type (normal/overstock)
        data.total_stock    // M: total_stock (現貨庫存)
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Products!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValue] },
      });
      return { ok: true };
    } catch (e) {
      console.error("Append Error:", e);
      throw e;
    }
  },

  // 3. 刪除商品邏輯
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

  // 4. 讀取所有訂單
  async getOrders() {
    try {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:M' });
      const rows = response.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const getVal = (name) => {
          const index = headers.indexOf(name);
          return (index !== -1 && row[index]) ? row[index] : '';
        };
        return { 
          orderId: getVal('order_ID'), productName: getVal('product_name'), 
          buyerName: getVal('buyer_name'), qty: getVal('qty'), status: getVal('status') 
        };
      });
    } catch (e) { return []; }
  }
};
export default sheetService;