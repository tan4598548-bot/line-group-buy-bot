import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!serviceAccountRaw || !SPREADSHEET_ID) {
  throw new Error("❌ 遺失環境變數。請檢查 GOOGLE_SERVICE_ACCOUNT_JSON 或 SPREADSHEET_ID。");
}

let credentials;
try {
  credentials = JSON.parse(serviceAccountRaw);
} catch (err) {
  throw new Error("❌ GOOGLE_SERVICE_ACCOUNT_JSON 格式錯誤。");
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // 取得商品列表
  async getProducts(filter = 'all') {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:N' });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      let data = rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return {
          productCode: get('商品代碼'), productName: get('商品名稱'),
          specSize: get('規格尺寸'), price: get('單價'), 
          status: get('(上架/已結單/斷貨)'),
          closeDate: get('結單日'), isStock: get('是否現貨'), cost: get('成本'),
          images: get('圖片'), youtube: get('youtube'), video: get('video'),
          type: get('類型'), stock: get('庫存'), description: get('說明')
        };
      });
      if (filter === 'active') return data.filter(p => p.status === '上架');
      if (filter === 'closed') return data.filter(p => p.status === '已結單');
      return data;
    } catch (e) { console.error(e); return []; }
  },

  // 新增商品
  async appendProduct(d) {
    const generatedCode = d.productCode || `P${Date.now().toString().slice(-8)}`;
    const specs = d.specSize || `規格:${d.colorMap || '無'} | 尺寸:${d.sizeMap || '無'}`;
    const row = [generatedCode, d.productName, specs, d.price, '上架', d.closeDate, d.isStock || 'FALSE', d.cost || 0, d.images, d.youtube, d.video, d.type, d.stock || 0, d.description];
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:N', valueInputOption: 'USER_ENTERED', resource: { values: [row] } });
    return generatedCode;
  },

  // 更新商品資訊
  async updateProduct(code, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!A:A' });
    const idx = res.data.values.findIndex(r => r[0] === code) + 1;
    if (idx <= 1) throw new Error("找不到該商品代碼");
    const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Products!1:1' });
    const headers = headerRes.data.values[0];
    const updates = [];
    const fieldMap = { productName: '商品名稱', price: '單價', status: '(上架/進單/斷貨)', specSize: '規格尺寸', description: '說明', images: '圖片', isStock: '是否現貨', type: '類型', cost: '成本' };
    for (const [key, value] of Object.entries(data)) {
      if (fieldMap[key]) {
        const colIdx = headers.indexOf(fieldMap[key]);
        if (colIdx !== -1) updates.push({ range: `Products!${String.fromCharCode(65 + colIdx)}${idx}`, values: [[value]] });
      }
    }
    if (updates.length > 0) await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: SPREADSHEET_ID, resource: { data: updates, valueInputOption: 'USER_ENTERED' } });
  },

  async updateProductStatus(code, newStatus) { return this.updateProduct(code, { status: newStatus }); },
  async deleteProduct(code) { return this.updateProduct(code, { status: '已下架/刪除' }); },

  // 取得訂單列表
  async getOrders() {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return { orderId: get('order_ID'), buyerId: get('buyer_ID'), buyerName: get('buyer_name'), productCode: get('product_code'), productName: get('product_name'), spec: get('spec'), qty: get('qty'), price: get('price'), total: get('total'), date: get('order_date'), status: get('status') };
      });
    } catch (e) { return []; }
  },

  // 買家下單
  async appendOrder(d) {
    const row = [d.orderId || `ORD${Date.now()}`, d.buyerId, d.buyerName, d.productCode, d.productName, d.spec, d.qty, d.price, d.total, d.orderDate || new Date().toLocaleDateString('zh-TW'), d.status || '待點貨'];
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K', valueInputOption: 'USER_ENTERED', resource: { values: [row] } });
  },

  async getBuyersByProduct(productCode) {
    const orders = await this.getOrders();
    return orders.filter(o => o.productCode === productCode && o.status !== '買家取消').map(o => ({ lineId: o.buyerId, buyerName: o.buyerName, qty: o.qty }));
  },

  // 核心：更新訂單與拆單功能 (優化 ID 比對)
  async updateOrderAndSplit(orderId, data) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:A' });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => String(r[0]) === String(orderId)) + 1;
    if (rowIndex <= 1) throw new Error("找不到該訂單 ID");

    const updates = [];
    if (data.status) updates.push({ range: `Orders!K${rowIndex}`, values: [[data.status]] });
    if (data.qty) updates.push({ range: `Orders!G${rowIndex}`, values: [[data.qty]] });
    if (data.total) updates.push({ range: `Orders!I${rowIndex}`, values: [[data.total]] });

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({ 
        spreadsheetId: SPREADSHEET_ID, 
        resource: { data: updates, valueInputOption: 'USER_ENTERED' } 
      });
    }

    // 處理到貨拆單邏輯
    if (data.split && data.arrivalQty) {
      const allRows = (await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K' })).data.values;
      const originalRow = allRows[rowIndex - 1];
      const remainingQty = parseInt(originalRow[6]) - data.arrivalQty;
      
      // 更新原訂單為已到貨
      await sheets.spreadsheets.values.update({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: `Orders!G${rowIndex}:K${rowIndex}`, 
        valueInputOption: 'USER_ENTERED', 
        resource: { values: [[data.arrivalQty, originalRow[7], (data.arrivalQty * originalRow[7]), originalRow[9], '已到貨']] } 
      });

      // 剩餘數量新增為新訂單
      if (remainingQty > 0) {
        const newRow = [...originalRow];
        newRow[0] = `${orderId}-rem${Date.now().toString().slice(-3)}`;
        newRow[6] = remainingQty;
        newRow[8] = remainingQty * originalRow[7];
        newRow[10] = '待點貨';
        await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:K', valueInputOption: 'USER_ENTERED', resource: { values: [newRow] } });
      }
    }
  },

  async getVendorData() {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Vendor!A:H' });
    const rows = res.data.values;
    if (!rows || rows.length <= 1) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const get = (n) => row[headers.indexOf(n)] || '';
      return { code: get('商品代碼'), name: get('商品名稱'), spec: get('採購規格'), targetQty: get('採購總數'), arrivedQty: get('實際到貨數'), orderDate: get('訂購日期'), payDate: get('匯款日期'), status: get('到貨狀態') };
    });
  },

  async syncToVendor(productCode) {
    const ordersRes = await this.getOrders();
    const targetOrders = ordersRes.filter(o => o.productCode === productCode && o.status !== '買家取消');
    if (targetOrders.length === 0) return;
    const totalQty = targetOrders.reduce((sum, o) => sum + parseInt(o.qty), 0);
    const prodName = targetOrders[0].productName;
    const row = [productCode, prodName, '依訂單彙整', totalQty, 0, new Date().toLocaleDateString('zh-TW'), '', '未到貨'];
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: 'Vendor!A:H', valueInputOption: 'USER_ENTERED', resource: { values: [row] } });
  }
};
export default sheetService;