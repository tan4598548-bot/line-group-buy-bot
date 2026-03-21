import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountRaw),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // 取得商品
  async getProducts(filter = 'all') {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, range: 'Products!A:O' 
      });
      const rows = res.data.values || [];
      if (rows.length <= 1) return [];
      const headers = rows[0];
      let data = rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return {
          productCode: get('商品代碼'), productName: get('商品名稱'),
          specSize: get('規格尺寸'), color: get('尺寸'),        
          price: parseInt(get('單價') || 0), status: get('(上架/已結單/斷貨)').trim(),
          closeDate: get('結單日'), isStock: get('是否現貨') === 'TRUE',
          cost: parseInt(get('成本') || 0), images: get('圖片'),
          stock: parseInt(get('庫存') || 0), type: get('類型'), description: get('說明')
        };
      });
      if (filter === 'active') return data.filter(p => p.status === '上架' && !p.isStock);
      if (filter === 'overstock') return data.filter(p => p.isStock && p.stock > 0 && p.status === '上架');
      return data;
    } catch (e) { return []; }
  },

  // 新增商品 (管理端)
  async appendProduct(d) {
    const row = [
      d.productCode, d.productName, d.specSize || '', d.color || '',
      Number(d.price) || 0, '上架', d.closeDate || '',
      d.isStock ? 'TRUE' : 'FALSE', Number(d.cost) || 0,
      d.images || '', '', '', d.isStock ? '現貨' : '預購', Number(d.stock) || 0, d.description || ''
    ];
    return await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID, range: 'Products!A:O',
      valueInputOption: 'USER_ENTERED', resource: { values: [row] }
    });
  },

  // 取得特定商品的買家 (用於斷貨推播)
  async getBuyersByProduct(productCode) {
    const orders = await this.getOrders();
    // 過濾出購買該商品且狀態不是「買家取消」或「斷貨」的買家 ID
    return orders
      .filter(o => o.productCode === productCode && o.status !== '買家取消')
      .map(o => ({ lineId: o.buyerId }));
  },

  // 更新商品狀態 (例如設為斷貨)
  async updateProductStatus(productCode, newStatus) {
    const products = await this.getProducts('all');
    const pIndex = products.findIndex(p => p.productCode === productCode);
    if (pIndex === -1) throw new Error("找不到該商品代碼");
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Products!F${pIndex + 2}`, // F 欄是狀態
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[newStatus]] }
    });
  },

  // 新增訂單 (含庫存檢查)
  async appendOrder(d) {
    const products = await this.getProducts('all');
    const pIndex = products.findIndex(p => p.productCode === d.productCode);
    if (pIndex === -1) throw new Error("商品不存在");
    const product = products[pIndex];

    if (product.isStock) {
        if (product.stock < d.qty) throw new Error(`庫存不足，剩餘：${product.stock}`);
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `Products!N${pIndex + 2}`,
            valueInputOption: 'USER_ENTERED', resource: { values: [[product.stock - d.qty]] }
        });
    }

    const row = [
      d.orderId || `ORD${Date.now()}`, d.buyerId, d.buyerName, d.productCode, 
      d.productName, d.spec, '', d.qty, d.price, d.total, 
      new Date().toLocaleDateString('zh-TW'), d.status || '待點貨'
    ];
    await sheets.spreadsheets.values.append({ 
      spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:L', 
      valueInputOption: 'USER_ENTERED', resource: { values: [row] } 
    });
  },

  // 修改訂單狀態
  async updateOrderWithCheck(orderId, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:L' });
    const rows = res.data.values || [];
    const headers = rows[0];
    const orderIndex = rows.findIndex(r => r[0] === String(orderId));
    if (orderIndex === -1) throw new Error("找不到訂單");

    // 檢查結單保護
    const productCode = rows[orderIndex][headers.indexOf('product_code')];
    const products = await this.getProducts('all');
    const product = products.find(p => p.productCode === productCode);
    if (product && product.status === '已結單') {
        throw new Error("⚠️ 團主已結單，無法修改或取消訂單");
    }

    // 現貨取消歸還庫存邏輯
    if (data.status === '買家取消' && product && product.isStock) {
      const pIndex = products.findIndex(p => p.productCode === productCode);
      const currentQty = parseInt(rows[orderIndex][headers.indexOf('qty')]);
      await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID, range: `Products!N${pIndex + 2}`,
          valueInputOption: 'USER_ENTERED', resource: { values: [[product.stock + currentQty]] }
      });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `Orders!L${orderIndex + 1}`,
      valueInputOption: 'USER_ENTERED', resource: { values: [[data.status]] }
    });
  },

  // 取得訂單 (對齊 19.jpg)
  async getOrders(userId = null) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:L' });
    const rows = res.data.values || [];
    if (rows.length <= 1) return [];
    const headers = rows[0];
    const orders = rows.slice(1).map(row => {
      const get = (n) => row[headers.indexOf(n)] || '';
      return { 
        orderId: get('order_ID'), buyerId: get('buyer_ID'), buyerName: get('buyer_name'),
        productCode: get('product_code'), productName: get('product_name'),
        spec: get('spec'), qty: parseInt(get('qty') || 0), price: parseInt(get('price') || 0),
        total: parseInt(get('total') || 0), orderDate: get('order_date'), 
        status: get('status(待點貨/已到貨/斷貨)')
      };
    });
    return userId ? orders.filter(o => o.buyerId === userId) : orders;
  }
};
export default sheetService;