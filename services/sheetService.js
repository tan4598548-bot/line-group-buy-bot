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
  // 1. 取得商品列表 (確保包含結單日)
  async getProducts(filter = 'all') {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:N' });
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
          status: get('(上架/已結單/斷貨)'), // 💡 關鍵判定欄位
          closeDate: get('結單日'), // 💡 提供給前端顯示
          isStock: get('是否現貨'), 
          cost: get('成本'),
          images: get('圖片'), 
          youtube: get('youtube'), 
          video: get('video'),
          type: get('類型'), 
          stock: get('庫存'), 
          description: get('說明')
        };
      });
      if (filter === 'active') return data.filter(p => p.status === '上架');
      return data;
    } catch (e) { console.error("getProducts Error:", e); return []; }
  },

  // 2. 新增商品
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

  // 3. 更新商品資訊 (包含狀態變更為「已結單」)
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
        closeDate: '結單日', youtube: 'youtube'
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

  // 4. 取得訂單列表
  async getOrders() {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return { 
          orderId: get('order_ID'), buyerId: get('buyer_ID'), buyerName: get('buyer_name'), 
          productCode: get('product_code'), productName: get('product_name'), 
          spec: get('spec'), qty: parseInt(get('qty') || 0), price: parseInt(get('price') || 0), 
          total: parseInt(get('total') || 0), orderDate: get('order_date'), status: get('status') 
        };
      });
    } catch (e) { return []; }
  },

  // 5. 新增訂單
  async appendOrder(d) {
    const row = [
      d.orderId || `ORD${Date.now()}`, d.buyerId, d.buyerName, d.productCode, 
      d.productName, d.spec, d.qty, d.price, d.total, 
      d.orderDate || new Date().toLocaleDateString('zh-TW'), d.status || '待點貨'
    ];
    await sheets.spreadsheets.values.append({ 
      spreadsheetId: SPREADSHEET_ID, 
      range: 'Orders!A:K', 
      valueInputOption: 'USER_ENTERED', 
      resource: { values: [row] } 
    });
  },

  // 6. 取得特定商品的買家名單 (用於團主統計)
  async