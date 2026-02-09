// services/productService.js
import * as sheetService from "./sheetService.js";


const SHEET_NAME = 'Products';

export function getActiveProducts() {
  const sheet = getSheet(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const header = rows.shift();

  return rows.map(r => {
    const obj = {};
    header.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

export function markReminded(productIds) {
  const sheet = getSheet(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx = header.indexOf('id');
  const remindedIdx = header.indexOf('_reminded');

  if (remindedIdx === -1) {
    sheet.getRange(1, header.length + 1).setValue('_reminded');
  }

  rows.slice(1).forEach((row, i) => {
    if (productIds.includes(row[idIdx])) {
      sheet.getRange(i + 2, remindedIdx + 1).setValue(true);
    }
  });
}
