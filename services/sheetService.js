import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {
  // 1. 讀取商品列表 (Products A-M)
  async getProducts() {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:M' });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return {
          productCode: get('商品代碼'), productName: get('商品名稱'),
          price: get('單價'), closeDate: get('結單日'),
          youtube: get('youtube'), video: get('video'), active: get('是否上架')
        };
      });
    } catch (e) { console.error("getProducts Error:", e); return []; }
  },

  // 2. 修正商品資訊
  async updateProduct(code, data) {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
      const rowIndex = res.data.values.findIndex(r => r[0] === code) + 1;
      if (rowIndex === 0) return;

      const updateMap = [
        { range: `Products!B${rowIndex}`, val: data.productName },
        { range: `Products!D${rowIndex}`, val: data.price },
        { range: `Products!F${rowIndex}`, val: data.closeDate },
        { range: `Products!J${rowIndex}`, val: data.youtube },
        { range: `Products!K${rowIndex}`, val: data.video }
      ];

      for (const item of updateMap) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: item.range,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[item.val]] }
        });
      }
    } catch (e) { console.error("updateProduct Error:", e); throw e; }
  },

  // 3. 新增商品
  async appendProduct(d) {
    try {
      const specs = `規格:${d.colorMap} | 尺寸:${d.sizeMap}`;
      const row = [d.productCode, d.productName, specs, d.price, 'TRUE', d.closeDate, 'FALSE', `成本:${d.cost}`, d.images, d.youtube, d.video, d.type, d.total_stock];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Products!A:M',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [row] }
      });
    } catch (e) { console.error("appendProduct Error:", e); throw e; }
  },

  // 4. 刪除商品
  async deleteProduct(code) {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
      const idx = res.data.values.findIndex(r => r[0] === code);
      if (idx === -1) return;
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sId = meta.data.sheets.find(s => s.properties.title === 'Products').properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests: [{ deleteDimension: { range: { sheetId: sId, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 } } }] }
      });
    } catch (e) { console.error("deleteProduct Error:", e); throw e; }
  },

  // 5. 讀取訂單 (Orders A-M)
  async getOrders() {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:M' });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return { 
          orderId: get('order_ID'), productName: get('product_name'), 
          buyerName: get('buyer_name'), qty: get('qty'), 
          status: get('status') // 這邊對應標題列為 "status" 的欄位
        };
      });
    } catch (e) { console.error("getOrders Error:", e); return []; }
  },

  // 6. 點貨更新狀態 (更新 K 欄)
  async updateOrderStatus(orderId, status) {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:A' });
      const rowIndex = res.data.values.findIndex(r => r[0] === String(orderId)) + 1;
      if (rowIndex === 0) return;

      // 更新 K 欄 (第 11 欄)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Orders!K${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[status]] }
      });
    } catch (e) { console.error("updateOrderStatus Error:", e); throw e; }
  },

  // 7. 一鍵清除已到貨商品
  async clearArrivedOrders() {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return;
      
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sId = meta.data.sheets.find(s => s.properties.title === 'Orders').properties.sheetId;

      // 從下往上刪除避免索引位移 (K 欄索引為 10)
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][10] === '已到貨') {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: { requests: [{ deleteDimension: { range: { sheetId: sId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }] }
          });
        }
      }
    } catch (e) { console.error("clearArrivedOrders Error:", e); throw e; }
  }
};

export default sheetService;