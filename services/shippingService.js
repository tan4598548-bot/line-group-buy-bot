/**
 * sheetService.js
 * - Orders：同步訂單明細
 * - Summary：出貨用
 * - VendorOrders：廠商訂貨 / 到貨管理
 */

const { google } = require('googleapis');
const path = require('path');

const KEY_FILE = path.join(__dirname, '..', 'google-service-account.json');
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const SHEET_ORDERS = 'Orders';
const SHEET_SUMMARY = 'Summary';
const SHEET_VENDOR = 'VendorOrders';

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/* ======================
   Orders（明細）
====================== */
async function rebuildOrders(orders) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A:Z`,
  });

  const header = [[
    '訂單編號','LINE ID','群友名稱','群組ID',
    '商品代碼','商品名稱','尺寸',
    '顏色代碼','顏色名稱','數量',
    '狀態','建立時間','修改備註'
  ]];

  const rows = orders.map((o, i) => ([
    i + 1,
    o.userId,
    o.userName,
    o.groupId || '',
    o.productCode,
    o.productName,
    o.size || '',
    o.color || '',
    o.colorName || '',
    o.quantity,
    o.status || 'ordered',
    o.time,
    o.note || ''
  ]));

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [...header, ...rows] },
  });
}

/* ======================
   VendorOrders（廠商訂貨）
====================== */
async function rebuildVendorOrders(orders) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_VENDOR}!A:Z`,
  });

  const header = [[
    '商品代碼','商品名稱','顏色','尺寸',
    '訂購總數','已到貨','未到貨',
    '成本單價','廠商','訂購日期','最後到貨日','狀態'
  ]];

  const map = {};

  orders.forEach(o => {
    const key = `${o.productCode}_${o.color || ''}_${o.size || ''}`;
    if (!map[key]) {
      map[key] = {
        productCode: o.productCode,
        productName: o.productName,
        color: o.color || '',
        size: o.size || '',
        total: 0,
      };
    }
    map[key].total += o.quantity;
  });

  const rows = Object.values(map).map(v => ([
    v.productCode,
    v.productName,
    v.color,
    v.size,
    v.total,
    0,
    v.total,
    '',
    '',
    new Date().toISOString(),
    '',
    'ordering'
  ]));

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_VENDOR}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [...header, ...rows] },
  });
}

/* ======================
   到貨扣 VendorOrders
====================== */
async function updateVendorArrived(productCode, color, size, qty) {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_VENDOR}!A2:L`,
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (
      r[0] === productCode &&
      r[2] === (color || '') &&
      r[3] === (size || '')
    ) {
      const total = Number(r[4]);
      const arrived = Number(r[5]) + qty;
      const remain = Math.max(total - arrived, 0);
      const status = remain === 0 ? 'done' : 'partial';

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_VENDOR}!F${i + 2}:L${i + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            arrived,
            remain,
            r[7] || '',
            r[8] || '',
            r[9] || '',
            new Date().toISOString(),
            status
          ]]
        }
      });
      break;
    }
  }
}

module.exports = {
  rebuildOrders,
  rebuildVendorOrders,
  updateVendorArrived
};
