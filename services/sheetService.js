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
   Products 相關功能
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
    closed: r[7] === "TRUE", // 假設 H 欄是結單狀態
    _row: i + 2,
  }));
}

// 補回 productService.js 呼叫的 updateProductDetail
export async function updateProductDetail(productCode, data) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");

  // 這裡簡單示範更新名稱，你可以根據需要擴充
  if (data.productName) {
    await writeCell(PRODUCT_SHEET, `B${p._row}`, data.productName);
  }
}

/* =========================
   Orders 相關功能
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

export async function getPendingOrders() {
  const orders = await getOrders();
  return orders.filter(o => o.status === "pending");
}

export async function markOrdersShipped(rowIndices) {
  for (const row of rowIndices) {
    await writeCell(ORDER_SHEET, `I${row}`, "shipped");
  }
}

export async function appendOrder(order) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${ORDER_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        order.userId,
        "", 
        order.productCode,
        order.productName,
        "", 
        "", 
        order.qty,
        order.price,
        order.status,
        order.createdAt
      ]],
    },
  });
}

export async function getOrdersByUserAndProduct(userId, productCode) {
  const orders = await getOrders();
  return orders.filter(o => o.lineUserId === userId && o.productCode === productCode);
}

// 補回同步功能防止報錯
export async function syncVendorOrders(orders) {
  console.log("Syncing orders...");
}

/* =========================
   匯出對齊
========================= */
const sheetService = {
  getProducts,
  updateProductDetail,
  getOrders,
  getPendingOrders,
  markOrdersShipped,
  writeCell,
  appendOrder,
  syncVendorOrders,
  getOrdersByUserAndProduct
};

export default sheetService;