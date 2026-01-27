const sheetService = require('./sheetService');

async function getAllOrdersForAdmin(filter = 'all') {
  const orders = await sheetService.getSheetData('Orders');
  const products = await sheetService.getSheetData('Products');

  let list = orders.map((o, idx) => {
    const p = products.find(p => p.productCode === o.productCode) || {};
    return {
      orderId: idx + 2,
      productCode: o.productCode,
      productName: p.productName || '',
      colorName: o.colorName || o.color,
      size: o.size,
      qty: o.qty,
      arriveStatus: o.arriveStatus,
      shipStatus: o.shipStatus,
    };
  });

  if (filter === 'notArrived') {
    list = list.filter(i => !i.arriveStatus);
  }
  if (filter === 'arrived') {
    list = list.filter(i => i.arriveStatus === 'arrived' && !i.shipStatus);
  }
  if (filter === 'shipped') {
    list = list.filter(i => i.shipStatus === 'shipped');
  }

  return list;
}

async function markArrived(orderId) {
  await sheetService.updateCell('Orders', orderId, 'arriveStatus', 'arrived');
}

async function markShipped(orderId) {
  await sheetService.updateCell('Orders', orderId, 'shipStatus', 'shipped');
}

async function getShippedOrdersOnly() {
  const orders = await sheetService.getSheetData('Orders');
  return orders.filter(o => o.shipStatus === 'shipped');
}

module.exports = {
  getAllOrdersForAdmin,
  markArrived,
  markShipped,
  getShippedOrdersOnly,
};
