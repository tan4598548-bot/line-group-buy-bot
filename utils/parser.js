/**
 * 解析群友下單指令
 * 支援多色拆單
 * + A01 2 BK,WH M
 */

module.exports.parseOrderText = (text) => {
  const clean = text.trim();
  if (!clean.startsWith('+')) return null;

  const parts = clean.split(/\s+/);
  if (parts.length < 5) return null;

  const [, productCode, qtyRaw, colorRaw, size] = parts;
  const qty = Number(qtyRaw);
  const colors = colorRaw.split(',').map(c => c.trim());

  return {
    productCode,
    qty,
    colors, // ← 注意這裡是陣列
    size
  };
};
