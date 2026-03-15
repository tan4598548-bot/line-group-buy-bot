import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!serviceAccountRaw || !SPREADSHEET_ID) {
  throw new Error("❌ 環境變數設定不完整");
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountRaw),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // === 商品功能 (對應 Products 工作表 A:N) ===
  async getProducts(filter = 'all') {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, range: 'Products!A:N' 
      });
      const rows = res.data.values || [];
      if (rows.length <= 1) return [];
      
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
          isStock: get('是否現貨') === 'TRUE',
          cost: parseInt(get('成本') || 0),
          images: get('圖片'),
          youtube: get('youtube'),
          video: get('video'),
          type: get('類型'),
          stock: parseInt(get('庫存') || 0),
          description: get('說明')
        };
      });
      return filter === 'active' ? data.filter(p => p.status === '上架') : data;
    } catch (e) { return []; }
  },

  async appendProduct(d) {
    const row = [
      d.productCode || `P${Date.now().toString().slice(-8)}`, d.productName, d.specSize || '', 
      d.price, '上架', d.closeDate || '', d.isStock || 'FALSE', d.cost || 0, 
      d.images || '', d.youtube || '', d.video || '', d.type || '', d.stock || 0, d.description || ''
    ];
    await sheets.spreadsheets.values.append({ 
      spreadsheetId: SPREADSHEET_ID, range: 'Products!A:N', 
      valueInputOption: 'USER_ENTERED', resource: { values: [row] } 
    });
  },

  async updateProduct(code, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:N' });
    const rows = res.data.values || [];
    const headers = rows[0];
    const rowIndex = rows.findIndex(r => r[0] === code) + 1;
    if (rowIndex <= 1) throw new Error("找不到商品");

    const fieldMap = { productName: '商品名稱', price: '單價', status: '(上架/已結單/斷貨)', specSize: '規格尺寸' };
    const updates = [];
    for (const [key, value] of Object.entries(data)) {
      if (fieldMap[key]) {
        const colIdx = headers.indexOf(fieldMap[key]);
        const colLetter = String.fromCharCode(65 + colIdx);
        updates.push({ range: `Products!${colLetter}${rowIndex}`, values: [[value]] });
      }
    }
    await sheets.spreadsheets.values.batchUpdate({ 
      spreadsheetId: SPREADSHEET_ID, resource: { data: updates, valueInputOption: 'USER_ENTERED' } 
    });
  },

  async updateProductStatus(code, newStatus) { return this.updateProduct(code, { status: newStatus }); },
  async deleteProduct(code) { return this.updateProduct(code, { status: '已下架/刪除' }); },

  // === 訂單功能 (對應 Orders 工作表 A:K) ===
  async getOrders(userId = null) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
    const rows = res.data.values || [];
    if (rows.length <= 1) return [];
    const headers = rows[0];
    const orders = rows.slice(1).map(row => {
      const get = (n) => row[headers.indexOf(n)] || '';
      return { 
        orderId: get('order_ID'), buyerId: get('buyer_ID'), buyerName: get('buyer_name'), 
        productCode: get('product_code'), productName: get('product_name'), spec: get('spec'), 
        qty: parseInt(get('qty') || 0), price: parseInt(get('price') || 0), 
        total: parseInt(get('total') || 0), orderDate: get('order_date'), status: get('status') 
      };
    });
    return userId ? orders.filter(o => o.buyerId === userId) : orders;
  },

  async appendOrder(d) {
    const row = [
      d.orderId || `ORD${Date.now()}`, d.buyerId, d.buyerName, d.productCode, 
      d.productName, d.spec, d.qty, d.price, d.total, 
      new Date().toLocaleDateString('zh-TW'), d.status || '待點貨'
    ];
    await sheets.spreadsheets.values.append({ 
      spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K', 
      valueInputOption: 'USER_ENTERED', resource: { values: [row] } 
    });
  },

  // 💡 核心安全檢查：修改前確認商品是否已結單
  async updateOrderWithCheck(orderId, data) {
    const orders = await this.getOrders();
    const order = orders.find(o => String(o.orderId) === String(orderId));
    if (!order) throw new Error("找不到訂單");

    const products = await this.getProducts();
    const product = products.find(p => p.productCode === order.productCode);
    
    // 如果商品已結單，且嘗試修改數量或取消，則拒絕
    if (product && product.status === '已結單' && data.status !== '已到貨') {
      throw new Error("⚠️ 團主已結單，無法修改或取消訂單");
    }

    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:A' });
    const rowIndex = res.data.values.findIndex(r => String(r[0]) === String(orderId)) + 1;

    const updates = [];
    if (data.status) updates.push({ range: `Orders!K${rowIndex}`, values: [[data.status]] });
    if (data.qty) {
        updates.push({ range: `Orders!G${rowIndex}`, values: [[data.qty]] });
        updates.push({ range: `Orders!I${rowIndex}`, values: [[data.qty * order.price]] });
    }
    await sheets.spreadsheets.values.batchUpdate({ 
      spreadsheetId: SPREADSHEET_ID, resource: { data: updates, valueInputOption: 'USER_ENTERED' } 
    });
  },

  async getBuyersByProduct(productCode) {
    const orders = await this.getOrders();
    return orders.filter(o => o.productCode === productCode && o.status !== '買家取消')
                 .map(o => ({ lineId: o.buyerId, buyerName: o.buyerName }));
  }
};

export default sheetService;