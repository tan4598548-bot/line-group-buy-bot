import { google } from "googleapis";

/* =========================
   Google Sheet 設定
========================= */

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const PRODUCT_SHEET = "Products";
const ORDER_SHEET = "Orders";

/* =========================
   共用
========================= */

async function readSheet(sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return res.data.values || [];
}

async function writeCell(sheet, cell, value) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!${cell}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

/* =========================
   Products
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
    _row: i + 2,
  }));
}

export async function getProductsClosingTomorrow() {
  const products = await getProducts();
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const target = d.toISOString().slice(0, 10);

  return products.filter(
    p => p.closeDate === target && !p.reminded
  );
}

export async function markProductReminded(productCode) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) return;
  await writeCell(PRODUCT_SHEET, `G${p._row}`, "TRUE");
}

/* =========================
   Orders
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
    note: r[9],
    _row: i + 2,
  }));
}

export async function getPendingOrders() {
  const orders = await getOrders();
  return orders.filter(o => o.status === "pending");
}

export async function markOrdersShipped(rows) {
  for (const r of rows) {
    await writeCell(ORDER_SHEET, `I${r}`, "shipped");
  }
}
