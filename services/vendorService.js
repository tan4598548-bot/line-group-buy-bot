import sheetService from "./sheetService.js";
import pdfService from "./pdfService.js";

/**
 * 產生廠商訂貨彙總 (對齊圖片 1, 2)
 * 此功能會統計所有 Orders 中尚未到貨的商品總量
 */
async function buildVendorOrders() {
  const orders = await sheetService.getOrders();
  // 篩選出已下單但尚未到貨的 (ordered)
  const pendingOrders = orders.filter(o => o.status === "ordered");
  
  const map = {};
  for (const o of pendingOrders) {
    const key = `${o.productCode}_${o.color}_${o.size}`;
    if (!map[key]) {
      map[key] = {
        productCode: o.productCode,
        productName: o.productName,
        color: o.color,
        size: o.size,
        qty: 0
      };
    }
    map[key].qty += Number(o.qty);
  }
  return Object.values(map);
}

/**
 * 同步到 Google Sheet 並回傳 PDF 連結
 */
export async function generateVendorOrderPdf() {
  const list = await buildVendorOrders();
  if (!list.length) throw new Error("目前沒有待訂購的商品");

  // 1. 同步到 VendorOrders 工作表
  await sheetService.replaceVendorOrders(list);

  // 2. 產出廠商採購 PDF (重複利用 pdfService)
  // 此處假設 pdfService 有針對廠商格式做處理，或直接用通用格式
  const pdfUrl = await pdfService.generateVendorPdf(list);
  return pdfUrl;
}

export default { generateVendorOrderPdf };