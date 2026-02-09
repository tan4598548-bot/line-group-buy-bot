const { exportOrdersSummaryByProduct } = require('./export');

if (parts[1] === '匯出') {
  try {
    const filename = await exportOrdersSummaryByProduct();
    return `✅ 訂單總表已匯出完成（按商品排序）：${filename}\n可直接用於分貨與發貨`;
  } catch (err) {
    return `❌ 匯出失敗\n${err}`;
  }
}
