import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!serviceAccountRaw || !SPREADSHEET_ID) {
  throw new Error("❌ 遺失環境變數。請檢查 GOOGLE_SERVICE_ACCOUNT_JSON 或 SPREADSHEET_ID。");
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountRaw),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // === 商品相關功能 ===

  // 取得所有商品 (包含詳細資訊與狀態)
  async getProducts(filter = 'all') {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Products!A:N' 
      });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      
      const headers = rows[0];
      let data = rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return {
          productCode: get('商品代碼'),
          productName: get('商品名稱'),
          specSize: get('規格尺寸'),
          price: parseInt(get('單價') || 0),
          status: get('(上架/已結單/斷貨)').trim(),
          closeDate: get('結單日'),
          isStock: get('是否現貨'),
          cost: parseInt(get('成本') || 0),
          images: get('圖片'),
          youtube: get('youtube'),
          video: get('video'),
          type: get('類型'),
          stock: parseInt(get('庫存') || 0),
          description: get('說明')
        };
      });

      if (filter === 'active') return data.filter(p => p.status === '上架');
      return data;
    } catch (e) {
      console.error("getProducts Error:", e);
      return [];
    }
  },

  // 新增商品
  async appendProduct(d) {
    const generatedCode = d.productCode || `P${Date.now().toString().slice(-8)}`;
    const row = [
      generatedCode, d.productName, d.specSize || '', d.price, '上架', 
      d.closeDate || '', d.isStock || 'FALSE', d.cost || 0, d.images || '', 
      d.youtube || '', d.video || '', d.type || '', d.stock || 0, d.description || ''
    ];
    await sheets.spreadsheets.values.append({ 
      spreadsheetId: SPREADSHEET_ID, 
      range: 'Products!A:N', 
      valueInputOption: 'USER_ENTERED', 
      resource: { values: [row] } 
    });
    return generatedCode;
  },

  // 更新商品資訊 (支持部分欄位更新)
  async updateProduct(code, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:N' });
    const rows = res.data.values;
    const headers = rows[0];
    const rowIndex = rows.findIndex(r => r[0] === code) + 1;
    
    if (rowIndex <= 1) throw new Error("找不到該商品代碼");

    const updates = [];
    const fieldMap = { 
        productName: '商品名稱', price: '單價', status: '(上架/已結單/斷貨)', 
        specSize: '規格尺寸', description: '說明', images: '圖片', 
        isStock: '是否現貨', type: '類型', cost: '成本', stock: '庫存',
        closeDate: '結單日', youtube: 'youtube', video: 'video'
    };

    for (const [key, value] of Object.entries(data)) {
      if (fieldMap[key]) {
        const colIdx = headers.indexOf(fieldMap[key]);
        if (colIdx !== -1) {
          const colLetter = String.fromCharCode(65 + colIdx);
          updates.push({ range: `Products!${colLetter}${rowIndex}`, values: [[value]] });
        }
      }
    }
    
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({ 
        spreadsheetId: SPREADSHEET_ID, 
        resource: { data: updates, valueInputOption: 'USER_ENTERED' } 
      });
    }
  },

  async updateProductStatus(code, newStatus) { return this.updateProduct(code, { status: newStatus }); },
  async deleteProduct(code) { return this.updateProduct(code, { status: '已下架/刪除' }); },

  // === 訂單相關功能 ===

  // 取得所有訂單
  async getOrders() {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Orders!A:K