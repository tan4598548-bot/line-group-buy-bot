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

/* =========================
   Products 相關
========================= */
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
    closed: r[7] === "TRUE",
    _row: i + 2,
  }));
}

// 對齊 index.js 的 updateProductStatus
export async function updateProductStatus(productCode, isActive) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell(PRODUCT_SHEET, `E${p._row}`, isActive ? "TRUE" : "FALSE");
}

// 對齊 index.js 的 markProductClosed
export async function markProductClosed(productCode) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell(PRODUCT_SHEET, `H${p._row}`, "TRUE");
}

// 對齊 index.js 的 getProductsClosingTomorrow
export async function getProductsClosingTomorrow() {
  const products = await getProducts();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  return products.filter(p => p.closeDate === dateStr);
}

/* =========================
   Orders 相關
========================= */
export async function getOrders() {
  const rows = await readSheet(ORDER_SHEET);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r, i) => ({
    lineUserId: r[0],
    buyerName: r[1],
    productCode: r[2],
    productName: r[3],
    color: r[4],
    size: r[5],
    qty: Number(r[6]),
    price: Number(r[7]),
    status: r[8],
    _row: i + 2,
  }));
}

// 重要：對齊 index.js 的 getBuyerOrders
export async function getBuyerOrders(userId) {
  const orders = await getOrders();
  return userId ? orders.filter(o => o.lineUserId === userId) : orders;
}

// 重要：對齊 index.js 的 getBuyerPendingOrders
export async function getBuyerPendingOrders(userId) {
  const orders = await getBuyerOrders(userId);
  return orders.filter(o => o.status === "pending");
}

// 重要：對齊 index.js 的 getShippingList
export async function getShippingList() {
  const orders = await getOrders();
  return orders.filter(o => o.status === "pending");
}

// 重要：對齊 index.js 的 markOrdersShipped
export async function markOrdersShipped(rowIndices) {
  const results = [];
  for (const row of rowIndices) {
    await writeCell(ORDER_SHEET, `I${row}`, "shipped");
    results.push({ _row: row, status: "shipped" });
  }
  return results;
}

// 重要：對齊 index.js 的 getBuyerPackingList
export async function getBuyerPackingList() {
  const orders = await getOrders();
  const packingMap = {};
  orders.forEach(o => {
    if (!packingMap[o.lineUserId]) packingMap[o.lineUserId] = [];
    packingMap[o.lineUserId].push({
      productName: o.productName,
      quantity: o.qty,
      price: o.price
    });
  });
  return packingMap;
}

const sheetService = {
  getProducts,
  updateProductStatus,
  markProductClosed,
  getBuyerOrders,
  getShippingList,
  markOrdersShipped,
  getBuyerPendingOrders,
  getProductsClosingTomorrow,
  getBuyerPackingList
};

export default sheetService;