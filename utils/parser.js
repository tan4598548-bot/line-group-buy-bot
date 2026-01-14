/**
 * parser.js
 * 功能：解析群友下單文字
 * 支援：
 * + A01 2 BK M
 * + A01 1 BK,WH L
 */

function parseOrderText(text) {
  const raw = text.trim();

  // 必須以 + 開頭
  if (!raw.startsWith('+')) return null;

  // 移除 +，用空白切
  const parts = raw.slice(1).trim().split(/\s+/);

  // 最少：商品  數量  顏色
  if (parts.length < 3) return null;

  const [productCode, qtyStr, colorStr, size] = parts;

  const quantity = parseInt(qtyStr, 10);
  if (isNaN(quantity) || quantity <= 0) return null;

  const colors = colorStr.split(',').map(c => c.trim()).filter(Boolean);

  if (colors.length === 0) return null;

  return {
    productCode,
    quantity,
    colors,
    size: size || ''
  };
}

module.exports = {
  parseOrderText
};
