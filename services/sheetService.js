import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountRaw),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // === 商品功能 (Products A:O) ===
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
          youtube: get('youtube'),
          video: get('video'),
          type: get('類型'),
          stock: parseInt(get('庫存') || 0),
          description: get('說明')
        };
      });

      if (filter === 'active') {
        return data.filter(p => p.status === '上架' && p.isStock === false);
      }
      if (filter === 'overstock') {
        // ✨ 現貨出清頁面專用：只抓取現貨且庫存 > 0 的商品
        return data.filter(p => p.isStock === true && p.stock > 0 && p.status === '上架');
      }
      return data;
    } catch (e) { return []; }
  },

  // === 訂單功能 (含先搶先贏機制) ===
  async appendOrder(d) {
    // 1. 重新抓取最新商品資訊 (確保庫存數據是最新的)
    const products = await this.getProducts('all');
    const pIndex = products.findIndex(p => p.productCode === d.productCode);
    const product = products[pIndex];

    if (!product) throw new Error("商品不存在");

    // 2. 🔥 先搶先贏：如果是現貨商品，檢查庫存是否足夠
    if (product.isStock) {
        if (product.stock < d.qty) {
            throw new Error(`庫存不足！剩餘數量：${product.stock}`);
        }
        
        // 3. 立即扣除庫存 (在寫入訂單前先佔位)
        const newStock = product.stock - d.qty;
        // 庫存位在 N 欄 (第14欄)，索引為 pIndex + 2
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Products!N${pIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[newStock]] }
        });
    }

    // 4. 寫入訂單 (Orders A:L)
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
    
    // 結單保護
    if (product && product.status === '已結單') {
        if (data.status === '買家取消' || data.qty) {
            throw new Error("⚠️ 團主已結單，無法修改或取消訂單");
        }
    }

    // 💡 取消訂單時，如果是現貨，應歸還庫存
    if (data.status === '買家取消' && product && product.isStock) {
        const pIndex = products.findIndex(p => p.productCode === order.productCode);
        const restoredStock = product.stock + order.qty;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Products!N${pIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[restoredStock]] }
        });
    }

    const idRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:A' });
    const rowIndex = idRes.data.values.findIndex(r => String(r[0]) === String(orderId)) + 1;

    const updates = [];
    if (data.status) updates.push({ range: `Orders!L${rowIndex}`, values: [[data.status]] });
    if (data.qty) {
        // 注意：修改數量的庫存連動邏輯較複雜，通常建議現貨訂單不開放買家自行修改數量，僅限取消重下
        updates.push({ range: `Orders!H${rowIndex}`, values: [[data.qty]] });
        updates.push({ range: `Orders!J${rowIndex}`, values: [[data.qty * order.price]] });
    }

    await sheets.spreadsheets.values.batchUpdate({ 
      spreadsheetId: SPREADSHEET_ID, 
      resource: { data: updates, valueInputOption: 'USER_ENTERED' } 
    });
  },

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
        orderId: get('order_ID'), buyerId: get('buyer_ID'), buyerName: get('buyer_name'),
        productCode: get('product_code'), productName: get('product_name'),
        spec: get('spec'), qty: parseInt(get('qty') || 0), price: parseInt(get('price') || 0),
        total: parseInt(get('total') || 0), orderDate: get('order_date'), status: get('status(待點貨/已到貨/斷貨)')
      };
    });
    return userId ? orders.filter(o => o.buyerId === userId) : orders;
  }
};

export default sheetService;