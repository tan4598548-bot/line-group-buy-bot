import { google } from "googleapis";

/* =========================
   Google Sheet 基本設定
========================= */

const auth = new google.auth.GoogleAuth({
  // 請確保 Render 的 Environment Variables 有設定此項
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

/* Sheet 名稱定義 */
const PRODUCT_SHEET = "Products";
const ORDER_SHEET = "Orders";

/* =========================
   工具：讀取整張 Sheet
========================= */

async function readSheet(sheetName) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    return res.data.values || [];
  } catch (error) {
    console.error(`讀取 ${sheetName} 失敗:`, error);
    return [];
  }
}

/* =========================
   工具：寫入指定儲存格
========================= */

async function writeCell(sheetName, cell, value) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${cell}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[value]],
    },
  });
}

/* =========================
   工具：新增一列資料 (用於下單)
========================= */

export async function appendRow(sheetName, dataObject) {
  // 先讀取標題列以確保資料對齊
  const rows = await readSheet(sheetName);
  const headers = rows[0] || [];
  
  // 依照標題順序排列資料
  const newRow = headers.map(h => dataObject[h] || "");

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [newRow],
    },
  });
}

/* =========================
   取得 Products（物件化）
========================= */

export async function getProducts() {
  const rows = await readSheet(PRODUCT_SHEET);
  if (rows.length <= 1) return [];

  const headers = rows[0];

  return rows.slice(1).map((row, index) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    obj._rowNumber = index + 2; // Sheet 實際列號
    return obj;
  });
}

/* =========================
   取得買家訂單 (用於 API / LIFF 查詢)
========================= */

export async function getBuyerOrders(userId) {
  const rows = await readSheet(ORDER_SHEET);
  if (rows.length <= 1) return [];

  const headers = rows[0];
  const allOrders = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return obj;
  });

  // 如果有提供 userId 則進行過濾
  return userId ? allOrders.filter(o => o.userId === userId) : allOrders;
}

/* =========================
   商品上下架
========================= */

export async function updateProductStatus(productCode, active) {
  const products = await getProducts();
  const target = products.find(p => p.productCode === productCode);
  if (!target) throw new Error("商品不存在");

  const headers = Object.keys(target).filter(k => !k.startsWith('_'));
  const colIndex = headers.indexOf("active");
  if (colIndex === -1) throw new Error("找不到 active 欄位");
  
  const colLetter = String.fromCharCode(65 + colIndex);
  await writeCell(PRODUCT_SHEET, `${colLetter}${target._rowNumber}`, active ? "TRUE" : "FALSE");
}

/* =========================
   手動結單
========================= */

export async function markProductClosed(productCode) {
  const products = await getProducts();
  const target = products.find(p => p.productCode === productCode);
  if (!target) throw new Error("商品不存在");

  const headers = Object.keys(target).filter(k => !k.startsWith('_'));

  const closedCol = headers.indexOf("closed");
  if (closedCol >= 0) {
    const colLetter = String.fromCharCode(65 + closedCol);
    await writeCell(PRODUCT_SHEET, `${colLetter}${target._rowNumber}`, "TRUE");
  }

  const activeCol = headers.indexOf("active");
  if (activeCol >= 0) {
    const colLetter = String.fromCharCode(65 + activeCol);
    await writeCell(PRODUCT_SHEET, `${colLetter}${target._rowNumber}`, "FALSE");
  }
}

// ... 你的其餘工具函式 (如 getTomorrowClosingProducts) 可依需求保留 ...