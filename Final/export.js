const ExcelJS = require('exceljs');
const { getAllOrders, getAllProducts } = require('./sheet');
const dayjs = require('dayjs');

async function exportOrdersSummaryByProduct() {
  const orders = await getAllOrders();

  // 只取正常訂單
  const normalOrders = orders.filter(o => o.status === '正常');

  // 依商品代碼排序
  normalOrders.sort((a, b) => a.productCode.localeCompare(b.productCode));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('訂單總表');

  // 欄位
  sheet.columns = [
    { header: '商品代碼', key: 'productCode', width: 10 },
    { header: '商品名稱', key: 'productName', width: 20 },
    { header: '群友名稱', key: 'name', width: 15 },
    { header: 'LINE ID', key: 'lineId', width: 25 },
    { header: '尺寸', key: 'size', width: 10 },
    { header: '顏色代號', key: 'colorCode', width: 10 },
    { header: '顏色名稱', key: 'colorName', width: 15 },
    { header: '數量', key: 'qty', width: 8 },
    { header: '建立時間', key: 'createdTime', width: 20 }
  ];

  // 將同一商品聚合，方便分貨
  const productMap = {};
  normalOrders.forEach(o => {
    if (!productMap[o.productCode]) productMap[o.productCode] = [];
    productMap[o.productCode].push(o);
  });

  for (const productCode of Object.keys(productMap).sort()) {
    const productOrders = productMap[productCode];
    const productName = productOrders[0].productName;

    // 先加商品標題列
    sheet.addRow([productCode, productName]);

    // 再列出下單群友明細
    productOrders.forEach(o => {
      sheet.addRow([
        '', // 商品代碼留空（標題已列）
        '', // 商品名稱留空
        o.name,
        o.lineId,
        o.size,
        o.colorCode,
        o.colorName,
        o.qty,
        o.createdTime
      ]);
    });

    // 空列分隔商品
    sheet.addRow([]);
  }

  const filename = `團購訂單總表_商品排序_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
  await workbook.xlsx.writeFile(filename);

  return filename;
}

module.exports = { exportOrdersSummaryByProduct };
