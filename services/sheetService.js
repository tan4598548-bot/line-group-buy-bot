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
          specSize: get('規格尺寸'), // C欄 (存放顏色)
          color: get('尺寸'),        // D欄 (存放尺寸)
          price: parseInt(get('單價') || 0),
          status: get('(上架/已結單/斷貨)').trim(), // E欄
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

      // 💡 修正處：當 filter 為 'active' 時，只回傳狀態完全等於「上架」的商品
      // 這樣「已結單」或「斷貨」的商品就不會出現給買家看
      if (filter === 'active') {
        return data.filter(p => p.status === '上架');
      }
      return data;
    } catch (e) { return []; }
  },

  async appendProduct(d) {
    const row = [
      d.productCode || `P${Date.now().toString().slice(-8)}`, d.productName, d.specSize || '', 
      d.color || '', d.price, '上架', d.closeDate || '', d.isStock || 'FALSE', 
      d.cost || 0, d.images || '', d.youtube || '', d.video || '', d.type || '', 
      d.stock || 0, d.description || ''
    ];
    await sheets.spreadsheets.values.append({ 
      spreadsheetId: SPREADSHEET_ID, range: 'Products!A:O', 
      valueInputOption: 'USER_ENTERED', resource: { values: [row] } 
    });
  },

  // === 訂單功能 (對應 Orders 工作表 A:L) ===
  async getOrders(userId = null) {
    const res = await sheets.spreadsheets.values.get({ 
      spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:L' 
    });
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
        status: get('status(待點貨/已到貨/斷貨)') 
      };
    });
    return userId ? orders.filter(o => o.buyerId === userId) : orders;
  },

  async appendOrder(d) {
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

  async updateOrderWithCheck(orderId, data) {
    const orders = await this.getOrders();
    const order = orders.find(o => String(o.orderId) === String(orderId));
    if (!order) throw new Error("找不到訂單");

    const products = await this.getProducts();
    const product = products.find(p => p.productCode === order.productCode);
    
    // 💡 結單保護：防止已結單商品被取消或修改數量
    if (product && product.status === '已結單') {
        if (data.status === '買家取消' || data.qty) {
            throw new Error("⚠️ 團主已結單，無法修改或取消訂單");
        }
    }

    const idRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:A' });
    const rowIndex = idRes.data.values.findIndex(r => String(r[0]) === String(orderId)) + 1;

    const updates = [];
    if (data.status) updates.push({ range: `Orders!L${rowIndex}`, values: [[data.status]] });
    if (data.qty) {
        updates.push({ range: `Orders!H${rowIndex}`, values: [[data.qty]] });
        updates.push({ range: `Orders!J${rowIndex}`, values: [[data.qty * order.price]] });
    }

    await sheets.spreadsheets.values.batchUpdate({ 
      spreadsheetId: SPREADSHEET_ID, 
      resource: { data: updates, valueInputOption: 'USER_ENTERED' } 
    });
  }
};

export default sheetService;