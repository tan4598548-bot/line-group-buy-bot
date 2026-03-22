import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountRaw),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // 1. 取得商品清單 (A:O 欄位)
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
          productCode: get('商品代碼'), 
          productName: get('商品名稱'),
          specSize: get('規格尺寸'), 
          color: get('尺寸'),        
          price: parseInt(get('單價') || 0), 
          status: get('(上架/已結單/斷貨)').trim(),
          closeDate: get('結單日'), 
          isStock: get('是否現貨') === 'TRUE',
          cost: parseInt(get('成本') || 0), 
          images: get('圖片'),
          stock: parseInt(get('庫存') || 0), 
          type: get('類型'), 
          description: get('說明')
        };
      });

      // 過濾掉標記為「已刪除」的商品
      data = data.filter(p => p.status !== '已刪除');

      if (filter === 'active') return data.filter(p => p.status === '上架' && !p.isStock);
      if (filter === 'overstock') return data.filter(p => p.isStock && p.stock > 0 && p.status === '上架');
      return data;
    } catch (e) { console.error("getProducts Error:", e); return []; }
  },

  // 2. 新增商品
  async appendProduct(d) {
    const row = [
      d.productCode, d.productName, d.specSize || '', d.color || '', 
      Number(d.price) || 0, '上架', d.closeDate || '', 
      d.isStock ? 'TRUE' : 'FALSE', Number(d.cost) || 0, d.images || '',
      '', '', '', Number(d.stock) || 0, d.description || ''
    ];
    return await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID, range: 'Products!A:O',
      valueInputOption: 'USER_ENTERED', resource: { values: [row] }
    });
  },

  // 3. 取得特定商品的買家
  async getBuyersByProduct(productCode) {
    const orders = await this.getOrders();
    return orders
      .filter(o => o.productCode === productCode && o.status !== '買家取消')
      .map(o => ({ lineId: o.buyerId }));
  },

  // 4. 更新商品狀態 (對應 Products 頁面 F 欄)
  async updateProductStatus(productCode, newStatus) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === String(productCode));
    if (rowIndex === -1) throw new Error("找不到商品");
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Products!F${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[newStatus]] }
    });
  },

  // 4.5 修正商品詳細資料 (新增此段)
  async updateProductDetail(productCode, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === String(productCode));
    if (rowIndex === -1) throw new Error("找不到商品");

    // 依序檢查要更新哪些欄位
    if (data.price) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Products!E${rowIndex + 1}`, // E 欄是單價
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[data.price]] }
      });
    }
    if (data.stock !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Products!N${rowIndex + 1}`, // N 欄是庫存
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[data.stock]] }
      });
    }
    if (data.productName) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Products!B${rowIndex + 1}`, // B 欄是品名
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[data.productName]] }
      });
    }
  },
  
  // 5. 新增訂單 (對應 19.jpg: G=qty, J=date, K=status)
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
      d.productName, d.spec, d.qty, d.price, d.total, 
      new Date().toLocaleDateString('zh-TW'), d.status || '待點貨'
    ];
    await sheets.spreadsheets.values.append({ 
      spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K', 
      valueInputOption: 'USER_ENTERED', resource: { values: [row] } 
    });
  },

  // 6. 修改訂單 (支援數量與狀態更新)
  async updateOrderWithCheck(orderId, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
    const rows = res.data.values || [];
    const headers = rows[0];
    const orderIndex = rows.findIndex(r => r[0] === String(orderId));
    if (orderIndex === -1) throw new Error("找不到訂單");

    const productCode = rows[orderIndex][headers.indexOf('product_code')];
    const products = await this.getProducts('all');
    const product = products.find(p => p.productCode === productCode);

    if (product && product.status === '已結單') {
        throw new Error("⚠️ 團主已結單，無法修改或取消訂單");
    }

    if (data.qty) {
      const price = parseInt(rows[orderIndex][headers.indexOf('price')] || 0);
      const newTotal = price * parseInt(data.qty);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Orders!G${orderIndex + 1}:I${orderIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[data.qty, price, newTotal]] }
      });
    }

    if (data.status === '買家取消' && product && product.isStock) {
      const pIndex = products.findIndex(p => p.productCode === productCode);
      const currentQty = parseInt(rows[orderIndex][headers.indexOf('qty')] || 0);
      await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID, range: `Products!N${pIndex + 2}`,
          valueInputOption: 'USER_ENTERED', resource: { values: [[product.stock + currentQty]] }
      });
    }

    if (data.status) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID, range: `Orders!K${orderIndex + 1}`,
        valueInputOption: 'USER_ENTERED', resource: { values: [[data.status]] }
      });
    }
  },

  // 7. 取得訂單 (過濾取消訂單)
  async getOrders(userId = null) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
    const rows = res.data.values || [];
    if (rows.length <= 1) return [];
    const headers = rows[0];
    
    const orders = rows.slice(1).map(row => {
      const get = (n) => row[headers.indexOf(n)] || '';
      return { 
        orderId: get('order_ID'), 
        buyerId: get('buyer_ID'), 
        buyerName: get('buyer_name'),
        productCode: get('product_code'), 
        productName: get('product_name'),
        spec: get('spec'), 
        qty: parseInt(get('qty') || 0), 
        price: parseInt(get('price') || 0),
        total: parseInt(get('total') || 0), 
        orderDate: get('order_date'), 
        status: row[10] || '' 
      };
    });

    if (userId) {
      return orders.filter(o => o.buyerId === userId && o.status !== '買家取消' && o.status !== '已刪除');
    }
    return orders;
  }
};

export default sheetService;