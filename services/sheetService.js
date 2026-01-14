/**
 * sheetService.js
 * 功能：
 * - 將訂單寫入 Google Sheet
 * - 依商品彙總（發貨用）
 */

const { google } = require('googleapis');
const path = require('path');

// 🔑 服務帳戶金鑰檔（請放在專案根目錄，並加到 .gitignore）
const KEY_FILE = path.join(__dirname, '..', 'google-service-account.json');

// 📊 Google Sheet 設定
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Sheet 名稱（請與你 Sheet 分頁名稱一致）
const SHEET_ORDERS = 'Orders';      // 訂單明細
const SHEET_SUMMARY = 'Summary';    // 發貨總表

// 建立 auth client
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// 取得 sheets API
async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/**
 * ➕ 新增一筆訂單（明細）
 * order = {
 *   userName,
 *   userId,
 *   productCode,
 *   productName,
 *   color,
 *   size,
 *   quantity,
 *   time
 * }
 */
async function appendOrder(order) {
  const sheets = await getSheets();

  const values = [[
    order.time,
    order.userName,
    order.userId,
    order.productCode,
    order.productName,
    order.color || '',
    order.size || '',
    order.quantity,
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * 📊 重新產生「發貨總表」
 * orders = array of order objects
 * 依 商品 → 顏色 → 尺寸 → 群友 彙總
 */
async function rebuildSummary(orders) {
  const sheets = await getSheets();

  // 先清空 Summary
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_SUMMARY}!A:Z`,
  });

  // 標題列
  const header = [[
    '商品代碼',
    '商品名稱',
    '顏色',
    '尺寸',
    '群友',
    '數量',
  ]];

  const rows = [];

  orders.forEach(o => {
    rows.push([
      o.productCode,
      o.productName,
      o.color || '',
      o.size || '',
      o.userName,
      o.quantity,
    ]);
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_SUMMARY}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [...header, ...rows],
    },
  });
}

module.exports = {
  appendOrder,
  rebuildSummary,
};
