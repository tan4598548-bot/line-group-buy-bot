import { google } from 'googleapis';

const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountRaw),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

export const sheetService = {
  // === 1. 商品功能 (Products A:O) ===
  
  // 取得商品清單 (支援過濾器)
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
        // 一般商城：顯示非現貨且上架中的商品
        return data.filter(p => p.status === '上架' && p.isStock === false);
      }
      if (filter === 'overstock') {
        // 現貨頁面：顯示是現貨、庫存大於0且上架中的商品
        return data.filter(p => p.isStock === true && p.stock > 0 && p.status === '上架');
      }
      return data;
    } catch (e) {
      console.error("讀取商品失敗:", e);
      return [];
    }
  },

  // ✨ 新增商品 (上架功能)
  async appendProduct(d) {
    try {
      const row = [
        d.productCode || `P${Date.now().toString().slice(-6)}`, // A: 商品代碼
        d.productName || '',                                   // B: 商品名稱
        d.specSize || '',                                      // C: 規格尺寸
        d.color || '',                                         // D: 尺寸
        Number(d.price) || 0,                                  // E: 單價
        d.status || '上架',                                    // F: 狀態
        d.closeDate || '',                                     // G: 結單日
        d.isStock ? 'TRUE' : 'FALSE',                          // H: 是否現貨
        Number(d.cost) || 0,                                   // I: 成本
        d.images || '',                                        // J: 圖片
        d.youtube || '',                                       // K: youtube
        d.video || '',                                         // L: video
        d.type || '',                                          // M: 類型
        Number(d.stock) || 0,                                  // N: 庫存
        d.description || ''                                    // O: 說明
      ];

      return await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Products!A:O',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [row] }
      });
    } catch (e) {
      console.error("Google Sheets 上架寫入失敗:", e);
      throw e;
    }
  },

  // === 2. 訂單功能 (含庫存控制邏輯) ===

  // 提交新訂單 (含「先搶先贏」庫存檢查)
  async appendOrder(d) {
    // 1. 抓取最新庫存資訊
    const products = await this.getProducts('all');
    const pIndex = products.findIndex(p => p.productCode === d.productCode);
    const product = products[pIndex];

    if (!product) throw new Error("商品不存在");

    // 2. 如果是現貨，實施先搶先贏機制
    if (product.isStock) {
        if (product.stock < d.qty) {
            // 前端會抓取這段文字並引導買家回現貨頁
            throw new Error(`很抱歉，商品已被搶完了！(剩餘庫存：${product.stock})`);
        }
        
        // 3. 立即更新 Google Sheet 庫存 (扣除)
        // 庫存在 N 欄 (第14欄)，列號為索引 + 2 (標題佔一列)
        const newStock = product.stock - d.qty;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Products!N${pIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[newStock]] }
        });
    }

    // 4. 寫入訂單資料 (Orders A:L)
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

  // 更新訂單 (含結單保護與庫存歸還)
  async updateOrderWithCheck(orderId, data) {
    const orders = await this.getOrders();
    const order = orders.find(o => String(o.orderId) === String(orderId));
    if (!order) throw new Error("找不到訂單");

    const products = await this.getProducts('all');
    const product = products.find(p => p.productCode === order.productCode);
    
    // 結單保護機制
    if (product && product.status === '已結單') {
        if (data.status === '買家取消' || data.qty) {
            throw new Error("⚠️ 團主已結單，無法修改或取消訂單");
        }
    }

    // 現貨訂單取消時，自動歸還庫存
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

    // 取得該筆訂單在試算表中的列號
    const idRes = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, range: 'Orders!A:A' 
    });
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
  },

  // 取得訂單清單
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
        total: parseInt(get('total') || 0), orderDate: get('order_date'), 
        status: get('status(待點貨/已到貨/斷貨)')
      };
    });
    return userId ? orders.filter(o => o.buyerId === userId) : orders;
  }
};

export default sheetService;