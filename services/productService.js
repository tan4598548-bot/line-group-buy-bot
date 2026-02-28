import sheetService from "./sheetService.js";

export async function listProducts(type) {
  const products = await sheetService.getProducts();
  return type ? products.filter(p => p.type === type) : products;
}

export async function createProduct(data) {
  const productData = {
    productCode: data.productCode || `P${Date.now()}`,
    productName: data.name || data.productName, // 相容不同前端命名
    colorMap: data.colorMap || "",
    price: Number(data.price) || 0,
    closeDate: data.closeDate || "",
    detailText: data.detailText || "",
    images: data.images || "",
    youtube: data.youtube || "",
    video: data.video || "",
    type: data.type || "normal",
    totalStock: Number(data.totalStock) || 0
  };
  return await sheetService.appendProduct(productData);
}

export default { listProducts, createProduct };