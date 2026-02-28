import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {
  async getProducts() {
    try {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:M' });
      const rows = response.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const getVal = (name) => {
          const index = headers.indexOf(name);
          return (index !== -1 && row[index]) ? row[index] : '';
        };
        return { productCode: getVal('商品代碼'), productName: getVal('商品名稱'), price: Number(getVal('單價')) || 0, active: getVal('是否上架'), closeDate: getVal('結單日'), type: getVal('type') || 'normal' };
      });
    } catch (e) { return []; }
  },

  // 實作修正邏輯
  async updateProduct(productCode, data) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
    const rows = response.data.values;
    const rowIndex = rows.findIndex(row => row[0] === productCode) + 1; // +1 因為從 1 開始計數
    
    if (rowIndex === 0) throw new Error("找不到商品");

    // 更新特定的欄位
    const requests = [
      { range: `Products!B${rowIndex}`, values: [[data.productName]] }, // B 欄: 商品名稱
      { range: `Products!D${rowIndex}`, values: [[data.price]] },       // D 欄: 單價
      { range: `Products!E${rowIndex}`, values: [[data.active]] },      // E 欄: 是否上架
      { range: `Products!F${rowIndex}`, values: [[data.closeDate]] }    // F 欄: 結單日
    ];

    for (const req of requests) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: req.range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: req.values }
      });
    }
  },

  async appendProduct(data) {
    const fullSpecs = `顏色:${data.colorMap} | 尺寸:${data.sizeMap}`;
    const rowValue = [data.productCode, data.productName, fullSpecs, data.price, 'TRUE', data.closeDate, 'FALSE', `成本:${data.cost}`, data.images, '', '', data.type, data.total_stock];
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:M', valueInputOption: 'USER_ENTERED', requestBody: { values: [rowValue] } });
  },

  async deleteProduct(productCode) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
    const rows = response.data.values;
    const rowIndex = rows.findIndex(row => row[0] === productCode);
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = sheetMeta.data.sheets.find(s => s.properties.title === 'Products').properties.sheetId;
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, resource: { requests: [{ deleteDimension: { range: { sheetId: sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }] } });
  },

  async getOrders() {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:M' });
    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const getVal = (name) => { const index = headers.indexOf(name); return (index !== -1 && row[index]) ? row[index] : ''; };
      return { orderId: getVal('order_ID'), productName: getVal('product_name'), buyerName: getVal('buyer_name'), qty: getVal('qty'), status: getVal('status') };
    });
  }
};
export default sheetService;