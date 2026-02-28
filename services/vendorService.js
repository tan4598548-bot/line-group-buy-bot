import sheetService from "./sheetService.js";
import pdfService from "./pdfService.js";

async function buildVendorOrders() {
  const orders = await sheetService.getOrders();
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

export async function getVendorSummary() {
  return await buildVendorOrders();
}

export async function generateVendorOrderPdf() {
  const list = await buildVendorOrders();
  if (!list.length) throw new Error("目前沒有待訂購的商品");
  await sheetService.replaceVendorOrders(list);
  return await pdfService.generateVendorPdf(list);
}

export default { getVendorSummary, generateVendorOrderPdf };