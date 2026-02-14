import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const PRODUCT_SHEET = "Products";
const ORDER_SHEET = "Orders";

async function readSheet(sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return res.data.values || [];
}

export async function writeCell(sheet, cell, value) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!${cell}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

export async function appendOrder(order) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${ORDER_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        order.userId,
        "", // buyerName
        order.productCode,
        order.productName,
        "", // color
        "", // size
        order.qty,
        order.price,
        order.status,
        order.createdAt
      ]],
    },
  });
}

export async function getProducts() {
  const rows = await readSheet(PRODUCT_SHEET);
  if (rows.length <= 1) return [];

  return rows.slice(1).map((r, i) => ({
    productCode: r[0],
    productName: r[1],
    colorMap: r[2],
    price: Number(r[3]),
    active: r[4] === "TRUE",
    closeDate: r[5],
    reminded: r[6] === "TRUE",
    _row: i + 2,
  }));
}

export async function syncVendorOrders(orders) {
  console.log("正在同步廠商訂單...", orders.length);
  // 實作同步邏輯...
}

export async function updateProductDetail(productCode, data) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");

  // 修正：使用 p._row 而非 p._rowNumber
  await writeCell(PRODUCT_SHEET, `B${p._row}`, data.productName || p.productName);
}

// 補上之前遺失的具名匯出
export async function getOrders() {
  const rows = await readSheet(ORDER_SHEET);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r, i) => ({
    lineUserId: r[0],
    productCode: r[2],
    status: r[8],
    _row: i + 2,
  }));
}

export async function getOrdersByUserAndProduct(userId, productCode) {
  const orders = await getOrders();
  return orders.filter(o => o.lineUserId === userId && o.productCode === productCode);
}

export default {
  getProducts,
  getOrders,
  appendOrder,
  writeCell,
  syncVendorOrders
};