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
        return data.filter(p => p.isStock === true && p.stock > 0 && p.status === '上架');
      }
      return data;
    } catch (e) { return []; }
  },

  async appendProduct(d) {
    const row = [
      d.productCode,          // A
      d.productName,          // B
      d.specSize || '',       // C
      d.color || '',          // D
      Number(d.price) || 0,   // E
      '上架',                 // F
      d.closeDate || '',      // G
      d.isStock ? 'TRUE' : 'FALSE', // H
      Number(d.cost) || 0,    // I
      d.images || '',         // J
      d.youtube || '',        // K
      d.video || '',          // L
      d.type || '',           // M
      Number(d.stock) || 0,   // N
      d.description || ''     // O
    ];
    return await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Products!A:O',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] }
    });
  },

  // === 訂單功能 (對齊 19.jpg 欄位順序) ===
  async appendOrder(d) {
    const products = await this.getProducts('all');
    const pIndex = products.findIndex(p => p.productCode === d.productCode);
    const product = products[pIndex];

    if (!product) throw new Error("商品不存在");

    if (product.isStock) {
        if (product.stock < d.qty) {
            throw new Error(`很抱歉，商品已被搶完了！(剩餘：${product.stock})`);
        }
        const newStock = product.stock - d.qty;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Products!N${pIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[newStock]] }
        });
    }

    // 依照 19.jpg 順序排列：A:ID, B:BuyerID, C:Name, D:Code, E:PName, F:Spec, G:空, H:Qty, I:Price, J:Total, K:Date, L:Status
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
        total: parseInt(get('total') || 0), orderDate: get('order_date'), status: get('status(待點貨/已到貨/斷貨)')
      };
    });
    return userId ? orders.filter(o => o.buyerId === userId) : orders;
  }
};
export default sheetService;