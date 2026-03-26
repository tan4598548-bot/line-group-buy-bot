import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountRaw),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // 1. 取得商品 (包含原有的 active/overstock 篩選邏輯)
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
    } catch (e) { console.error("getProducts Error:", e); return []; }
  },

  // 2. 結單同步至 VendorOrders (採購表 A:J 欄位)
  async syncToVendorOrders(order) {
    const res = await sheets.spreadsheets.values.get({ 
      spreadsheetId: SPREADSHEET_ID, range: 'VendorOrders!A:J' 
    });
    const rows = res.data.values || [];
    
    const vIndex = rows.findIndex(r => r[0] === order.productCode && r[2] === order.spec && r[7] === '未到貨');

    if (vIndex === -1) {
      const newRow = [
        order.productCode, order.productName, order.spec, order.qty, 0,
        new Date().toLocaleDateString('zh-TW'), '', '未到貨', '', ''
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: 'VendorOrders!A:J',
        valueInputOption: 'USER_ENTERED', resource: { values: [newRow] }
      });
    } else {
      const currentQty = parseInt(rows[vIndex][3] || 0);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID, range: `VendorOrders!D${vIndex + 1}`,
        valueInputOption: 'USER_ENTERED', resource: { values: [[currentQty + order.qty]] }
      });
    }
  },

  // 3. 取得買家清單 (用於推播)
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

  // 5. 新增訂單 (包含原有的庫存扣除邏輯)
  async appendOrder(d) {
    const products = await this.getProducts('all');
    const product = products.find(p => p.productCode === d.productCode);
    if (!product) throw new Error("商品不存在");

    if (product.isStock) {
        if (product.stock < d.qty) throw new Error(`庫存不足`);
        const pIndex = products.findIndex(p => p.productCode === d.productCode);
        // 更新 Products 表 N 欄 (庫存)
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

  // 6. 修改訂單 (含結單鎖定檢查與金額重新計算)
  async updateOrderWithCheck(orderId, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
    const rows = res.data.values || [];
    const headers = rows[0];
    const orderIndex = rows.findIndex(r => r[0] === String(orderId));
    if (orderIndex === -1) throw new Error("找不到訂單");

    const currentStatus = rows[orderIndex][headers.indexOf('status') || 10];
    if (currentStatus === '已結單' && data.status !== '已結單' && data.status !== '已到貨') {
      throw new Error("⚠️ 訂單已結單鎖定，僅能變更為已到貨");
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

  // 7. 取得訂單 (買家/團主通用)
  async getOrders(userId = null) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
    const rows = res.data.values || [];
    if (rows.length <= 1) return [];
    const headers = rows[0];
    const orders = rows.slice(1).map(row => {
      const get = (n) => row[headers.indexOf(n)] || '';
      return { 
        orderId: row[0], buyerId: row[1], buyerName: row[2],
        productCode: row[3], productName: row[4],
        spec: row[5], qty: parseInt(row[6] || 0), price: parseInt(row[7] || 0),
        total: parseInt(row[8] || 0), orderDate: row[9], status: row[10] || '' 
      };
    });
    return userId ? orders.filter(o => o.buyerId === userId && o.status !== '買家取消') : orders;
  },

  // 8. 取得採購表內容 (VendorOrders)
  async getVendorOrders() {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'VendorOrders!A:J' });
    const rows = res.data.values || [];
    if (rows.length