import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {

  // ==========================================
  // 1️⃣ 商品管理 (Products 表)
  // ==========================================

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
          price: get('單價'),
          status: get('狀態'), // 上架 / 已結單 / 斷貨
          closeDate: get('結單日'),
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
      if (filter === 'closed') return data.filter(p => p.status === '已結單');
      return data;
    } catch (e) { console.error(e); return []; }
  },

  async appendProduct(d) {
    const generatedCode = d.productCode || `P${Date.now().toString().slice(-8)}`;
    const specs = `規格:${d.colorMap || '無'} | 尺寸:${d.sizeMap || '無'}`;
    const row = [
      generatedCode, d.productName, specs, d.price, '上架', 
      d.closeDate, d.isStock || 'FALSE', d.cost, d.images, d.youtube, 
      d.video, d.type, d.total_stock, d.description
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Products!A:N',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] }
    });
    return generatedCode;
  },

  async updateProductStatus(code, newStatus) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
    const idx = res.data.values.findIndex(r => r[0] === code) + 1;
    if (idx <= 0) return;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Products!E${idx}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[newStatus]] }
    });
  },

  // ==========================================
  // 2️⃣ 訂單與到貨點貨 (Orders 表)
  // ==========================================

  async getOrders() {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return { 
          orderId: get('order_ID'),
          buyerId: get('buyer_ID'),
          buyerName: get('buyer_name'),
          productCode: get('product_code'),
          productName: get('product_name'),
          spec: get('spec'),
          qty: get('qty'),
          price: get('price'),
          total: get('total'),
          date: get('order_date'),
          status: get('status')
        };
      });
    } catch (e) { return []; }
  },

  // 用於斷貨通知抓取名單
  async getBuyersByProduct(productCode) {
    const orders = await this.getOrders();
    return orders.filter(o => o.productCode === productCode && o.status !== '斷貨')
                 .map(o => ({
                   lineId: o.buyerId,
                   buyerName: o.buyerName,
                   qty: o.qty
                 }));
  },

  async updateOrderAndSplit(orderId, data) {
    const { status, split, arrivalQty } = data;
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
    const rows = res.data.values;
    const rowIndex = rows.findIndex(r => r[0] === String(orderId));
    if (rowIndex === -1) return;

    if (split) {
      const originalRow = [...rows[rowIndex]];
      const originalQty = parseInt(originalRow[6]);
      const remainingQty = originalQty - arrivalQty;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Orders!G${rowIndex+1}:K${rowIndex+1}`,
        valueInputOption: 'USER_ENTERED', 
        resource: { values: [[arrivalQty, originalRow[7], originalRow[8], originalRow[9], '已到貨']] }
      });

      const newRow = [...originalRow];
      newRow[0] = `${orderId}-rem${Date.now().toString().slice(-3)}`;
      newRow[6] = remainingQty;
      newRow[10] = '待點貨';
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Orders!A:K',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [newRow] }
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Orders!K${rowIndex+1}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[status]] }
      });
    }
  },

  // ==========================================
  // 3️⃣ 廠商管理 (Vendor 表)
  // ==========================================

  async getVendorData() {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Vendor!A:H' });
    const rows = res.data.values;
    if (!rows || rows.length <= 1) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const get = (n) => row[headers.indexOf(n)] || '';
      return {
        code: get('商品代碼'),
        name: get('商品名稱'),
        spec: get('採購規格'),
        targetQty: get('採購總數'),
        arrivedQty: get('實際到貨數'),
        orderDate: get('訂購日期'),
        payDate: get('匯款日期'),
        status: get('到貨狀態')
      };
    });
  },

  async syncToVendor(productCode) {
    const ordersRes = await this.getOrders();
    const targetOrders = ordersRes.filter(o => o.productCode === productCode);
    if (targetOrders.length === 0) return;

    const totalQty = targetOrders.reduce((sum, o) => sum + parseInt(o.qty), 0);
    const prodName = targetOrders[0].productName;
    
    const row = [
      productCode, prodName, '依訂單彙整', totalQty, 0, 
      new Date().toLocaleDateString('zh-TW'), '', '未到貨'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Vendor!A:H',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] }
    });
  }
};

export default sheetService;