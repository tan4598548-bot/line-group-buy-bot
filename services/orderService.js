import * as sheetService from './sheetService.js';

export async function handleOrder(text, event) {
  const userId = event.source.userId;

  // 解析訊息內容，例如：+P001 紅色 L 2
  const parts = text.replace('+', '').trim().split(' ');
  const [productCode, colorCode, size, qtyStr] = parts;
  const qty = Number(qtyStr || 1);

  // 取得商品清單
  const products = await sheetService.getProducts();
  const product = products.find(p => p.productCode === productCode);

  if (!product) {
    return { type: 'text', text: '❌ 找不到此商品代號' };
  }

  // 檢查商品狀態 (對應 Sheet 中的 active 欄位)
  if (product.active === 'FALSE' || product.closed === 'TRUE') {
    return { type: 'text', text: '⚠️ 此商品已鎖單 / 停售，無法下單' };
  }

  // 顏色名稱轉換
  const colorMap = product.colorMap || '';
  let colorName = colorCode;
  colorMap.split(',').forEach(c => {
    const [code, name] = c.split(':');
    if (code === colorCode) colorName = name;
  });

  // 寫入訂單 (對應 Sheet 中的 Orders 分頁)
  // 請確保 Orders 分頁第一列標題包含這些關鍵字
  await sheetService.appendRow('Orders', {
    userId: userId,
    productCode: productCode,
    colorCode: colorCode,
    colorName: colorName,
    size: size,
    qty: qty,
    orderDate: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  });

  return {
    type: 'text',
    text: `✅ 下單成功\n商品：${product.productName}\n規格：${colorName} ${size} x${qty}`,
  };
}

// 買家訂單查詢
export async function getBuyerOrders(userId) {
  return await sheetService.getBuyerOrders(userId);
}