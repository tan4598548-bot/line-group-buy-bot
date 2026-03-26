import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountRaw),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // 1. 取得商品
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
      data = data.filter(p => p.status !== '已刪除');
      if (filter === 'active') return data.filter(p => p.status === '上架' && !p.isStock);
      if (filter === 'overstock') return data.filter(p => p.isStock && p.stock > 0 && p.status === '上架');
      return data;
    } catch (e) { return []; }
  },

  // 2. 結單同步至 VendorOrders (廠商採購表)
  async syncToVendorOrders(order) {
    const res = await sheets.spreadsheets.values.get({ 
      spreadsheetId: SPREADSHEET_ID, range: 'VendorOrders!A:H' 
    });
    const rows = res.data.values || [];
    
    // 檢查 VendorOrders 是否已有相同商品代碼 + 規格，且狀態為「未到貨」
    const vIndex = rows.findIndex(r => r[0] === order.productCode && r[2] === order.spec && r[7] === '未到貨');

    if (vIndex === -1) {
      // 新增一筆採購需求
      const newRow = [
        order.productCode, 
        order.productName, 
        order.spec, 
        order.qty, // 採購總數
        0,         // 實際到貨數
        new Date().toLocaleDateString('zh-TW'), // 訂貨日期
        '',        // 匯款日期(留空)
        '未到貨'    // 到貨狀態
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: 'VendorOrders!A:H',
        valueInputOption: 'USER_ENTERED', resource: { values: [newRow] }
      });
    } else {
      // 累加採購總數 (D 欄)
      const currentQty = parseInt(rows[vIndex][3] || 0);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `VendorOrders!D${vIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[currentQty + order.qty]] }
      });
    }
  },

  // 3. 取得買家
  async getBuyersByProduct(productCode) {
    const orders = await this.getOrders();
    return orders
      .filter(o => o.productCode === productCode && o.status !== '買家取消')
      .map(o => ({ lineId: o.buyerId }));
  },

  // 4. 更新商品狀態
  async updateProductStatus(productCode, newStatus) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === String(productCode));
    if (rowIndex === -1) throw new Error("找不到商品");
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `Products!F${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED', resource: { values: [[newStatus]] }
    });
  },

  // 5. 新增訂單
  async appendOrder(d) {
    const products = await this.getProducts('all');
    const product = products.find(p => p.productCode === d.productCode);
    if (!product) throw new Error("商品不存在");

    if (product.isStock) {
        if (product.stock < d.qty) throw new Error(`庫存不足`);
        const pIndex = products.findIndex(p => p.productCode === d.productCode);
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

  // 6. 修改訂單 (含結單鎖定檢查)
  async updateOrderWithCheck(orderId, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
    const rows = res.data.values || [];
    const headers = rows[0];
    const orderIndex = rows.findIndex(r => r[0] === String(orderId));
    if (orderIndex === -1) throw new Error("找不到訂單");

    // 若訂單狀態已經是「已結單」，禁止修改 (除非是將狀態改為已結單的動作本身)
    if (rows[orderIndex][headers.indexOf('status')] === '已結單' && data.status !== '已結單') {
      throw new Error("⚠️ 訂單已結單，無法修改");
    }

    const rowNum = orderIndex + 1;
    if (data.qty) {
      const price = parseInt(rows[orderIndex][headers.indexOf('price')] || 0);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID, range: `Orders!G${rowNum}:I${rowNum}`,
        valueInputOption: 'USER_ENTERED', resource: { values: [[data.qty, price, price * data.qty]] }
      });
    }

    if (data.status) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID, range: `Orders!K${rowNum}`,
        valueInputOption: 'USER_ENTERED', resource: { values: [[data.status]] }
      });
    }
  },

  // 7. 取得訂單
  async getOrders(userId = null) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
    const rows = res.data.values || [];
    if (rows.length <= 1) return [];
    const headers = rows[0];
    const orders = rows.slice(1).map(row => {
      const get = (n) => row[headers.indexOf(n)] || '';
      return { 
        orderId: get('order_ID'), buyerId: get('buyer_ID'), buyerName: get('buyer_name'),
        productCode: get('product_code'), productName: get('product_name'),
        spec: get('spec'), qty: parseInt(get('qty') || 0), price: parseInt(get('price') || 0),
        total: parseInt(get('total') || 0), orderDate: get('order_date'), status: row[10] || '' 
      };
    });
    return userId ? orders.filter(o => o.buyerId === userId && o.status !== '買家取消') : orders;
  }
};

export default sheetService;