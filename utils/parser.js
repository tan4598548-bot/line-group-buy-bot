/**
 * 解析下單格式
 * + A01 2 BK,BL M
 */

function parseOrderText(text) {
  const raw = text.replace('+', '').trim();
  const parts = raw.split(/\s+/);

  if (parts.length < 4) {
    return { ok: false, error: '❌ 格式錯誤\n正確格式：+ 商品代碼 數量 顏色 尺寸' };
  }

  const [productCode, qtyStr, colorStr, size] = parts;

  const qty = Number(qtyStr);
  if (isNaN(qty) || qty <= 0) {
    return { ok: false, error: '❌ 數量必須是正整數' };
  }

  const colors = colorStr.split(',').map(c => c.trim()).filter(Boolean);
  if (colors.length === 0) {
    return { ok: false, error: '❌ 顏色不可空白' };
  }

  return {
    ok: true,
    order: {
      productCode,
      qty,
      colors,
      size
    }
  };
}

module.exports = {
  parseOrderText
};
