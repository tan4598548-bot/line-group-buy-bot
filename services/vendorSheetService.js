/**
 * vendorSheetService.js
 * 功能：
 * - 結單時，將 orders.json 彙總為「廠商訂貨表」
 */

const { google } = require('googleapis');
const path = require('path');

const KEY_FILE = path.join(__dirname, '..', 'google-service-account.json');
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Sheet 分頁名稱（請先在 Google Sheet 建好）
const SHEET_VENDOR = 'VendorOrders';

// Google auth
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/**
 * 將訂單彙總後寫入 VendorOrders
 * @param {Array} orders - orderService.getAllOrders()
 */
async function buildVendorOrders(orders) {
  const sheets = await getSheets();

  // 1️⃣ 彙總：商品 + 顏色 + 尺寸
  const map = {};

  orders.forEach(o => {
    const key = `${o.productCode}|${o.color || ''}|${o.size || ''}`;
    if (!map[key]) {
      map[key] = {
        productCode: o.productCode,
        productName: o.productName,
        color: o.color || '',
        size: o.size || '',
        quantity: 0,
      };
    }
    map[key].quantity += o.quantity;
  });

  const rows = Object.values(map).map(v => [
    v.productCode,
    v.productName,
    v.color,
    v.size,
    v.quantity,
    '' // 備註
  ]);

  // 2️⃣ 清空舊資料
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_VENDOR}!A:Z`,
  });

  // 3️⃣ 寫入表頭 + 資料
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_VENDOR}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        ['商品代碼', '商品名稱', '顏色', '尺寸', '總數量', '備註'],
        ...rows
      ],
    },
  });
}

module.exports = {
  buildVendorOrders,
};
