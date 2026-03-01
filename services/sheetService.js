import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const sheetService = {
  // ==========================================
  // A. 商品管理功能 (Products 工作表)
  // ==========================================

  async getProducts() {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Products!A:M' 
      });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return {
          productCode: get('商品代碼'),
          productName: get('商品名稱'),
          price: get('單價'),
          closeDate: get('結單日'),
          youtube: get('youtube'),
          video: get('video'),
          active: get('是否上架')
        };
      });
    } catch (e) {
      console.error("getProducts Error:", e);
      return [];
    }
  },

  async updateProduct(code, data) {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Products!A:A' 
      });
      const rowIndex = res.data.values.findIndex(r => r[0] === code) + 1;
      if (rowIndex === 0) throw new Error("找不到該商品代碼");

      const updateMap = [
        { range: `Products!B${rowIndex}`, val: data.productName },
        { range: `Products!D${rowIndex}`, val: data.price },
        { range: `Products!F${rowIndex}`, val: data.closeDate },
        { range: `Products!J${rowIndex}`, val: data.youtube },
        { range: `Products!K${rowIndex}`, val: data.video }
      ];

      for (const item of updateMap) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: item.range,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[item.val]] }
        });
      }
    } catch (e) {
      console.error("updateProduct Error:", e);
      throw e;
    }
  },

  async appendProduct(d) {
    try {
      const specs = `規格:${d.colorMap} | 尺寸:${d.sizeMap}`;
      const row = [
        d.productCode, d.productName, specs, d.price, 
        'TRUE', d.closeDate, 'FALSE', `成本:${d.cost}`, 
        d.images, d.youtube, d.video, d.type, d.total_stock
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Products!A:M',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [row] }
      });
    } catch (e) {
      console.error("appendProduct Error:", e);
      throw e;
    }
  },

  async deleteProduct(code) {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Products!A:A' 
      });
      const idx = res.data.values.findIndex(r => r[0] === code);
      if (idx === -1) return;
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sId = meta.data.sheets.find(s => s.properties.title === 'Products').properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { 
          requests: [{ 
            deleteDimension: { 
              range: { sheetId: sId, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 } 
            } 
          }] 
        }
      });
    } catch (e) {
      console.error("deleteProduct Error:", e);
      throw e;
    }
  },

  // ==========================================
  // B. 訂單與拆單點貨功能 (Orders 工作表)
  // ==========================================

  async getOrders() {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Orders!A:M' 
      });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const get = (n) => row[headers.indexOf(n)] || '';
        return { 
          orderId: get('order_ID'), 
          productName: get('product_name'), 
          buyerName: get('buyer_name'), 
          qty: get('qty'), 
          status: get('status') 
        };
      });
    } catch (e) {
      console.error("getOrders Error:", e);
      return [];
    }
  },

  // 核心修正：支援拆單邏輯
  async updateOrderStatus(orderId, data) {
    try {
      const { status, split, arrivalQty } = data;
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Orders!A:M' 
      });
      const rows = res.data.values;
      const headers = rows[0];
      const rowIndex = rows.findIndex(r => r[0] === String(orderId));
      
      if (rowIndex === -1) throw new Error("找不到訂單");

      if (split) {
        // 1. 計算剩餘數量
        const originalRow = [...rows[rowIndex]];
        const qtyIdx = headers.indexOf('qty');
        const statusIdx = headers.indexOf('status');
        
        const originalTotal = parseInt(originalRow[qtyIdx]);
        const remainingQty = originalTotal - arrivalQty;

        // 2. 更新原始行：數量改為「本次到貨數」，狀態改為「已到貨」
        // 使用 update 修改該行的 qty (H欄) 與 status (K欄)
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Orders!H${rowIndex + 1}`, // 數量欄位
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[arrivalQty]] }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Orders!K${rowIndex + 1}`, // 狀態欄位
          valueInputOption: 'USER_ENTERED',
          resource: { values: [['已到貨']] }
        });

        // 3. 新增剩餘數量的行：狀態設為「待點貨」
        const newRow = [...originalRow];
        newRow[0] = `${orderId}-rem${Date.now().toString().slice(-4)}`; // 生成不重複 ID
        newRow[qtyIdx] = remainingQty;
        newRow[statusIdx] = '待點貨';

        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Orders!A:M',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [newRow] }
        });
      } else {
        // 一般更新：僅更新 K 欄狀態
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Orders!K${rowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[status]] }
        });
      }
    } catch (e) {
      console.error("updateOrderStatus Error:", e);
      throw e;
    }
  },

  async clearArrivedOrders() {
    try {
      const res = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Orders!A:K' 
      });
      const rows = res.data.values;
      if (!rows || rows.length <= 1) return;
      
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sId = meta.data.sheets.find(s => s.properties.title === 'Orders').properties.sheetId;

      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][10] === '已到貨') { 
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: { 
              requests: [{ 
                deleteDimension: { 
                  range: { sheetId: sId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } 
                } 
              }] 
            }
          });
        }
      }
    } catch (e) {
      console.error("clearArrivedOrders Error:", e);
      throw e;
    }
  }
};

export default sheetService;