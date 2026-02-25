/**
 * 解析下單格式：
 * A01 2 BK M
 */
export function parseOrder(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const productCode = parts[0];
  const quantity = Number(parts[1]);
  if (isNaN(quantity) || quantity <= 0) return null;

  const colorPart = parts[2];
  const size = parts[3] || '';

  // 支援多顏色逗號分隔處理
  const colors = colorPart.split(',').map(c => c.toUpperCase());

  return {
    productCode,
    quantity,
    colors,
    size,
  };
}

export default { parseOrder };