import sheetService from "./sheetService.js";

export async function listProducts(type) {
  const products = await sheetService.getProducts();
  if (type) return products.filter(p => p.type === type);
  return products;
}

export async function createProduct(data) {
  const productData = {
    productCode: data.productCode || `P${Date.now()}`,
    productName: data.name,
    colorMap: data.colorMap || "",
    price: data.price,
    closeDate: data.closeDate,
    detailText: data.detailText || "",
    images: data.images || "",
    youtube: data.youtube || "",
    video: data.video || "",
    type: data.type || "normal",
    totalStock: data.totalStock || 0
  };
  return await sheetService.appendProduct(productData);
}

export async function updateProductStatus(productCode, isActive) {
  const products = await sheetService.getProducts();
  const p = products.find(i => i.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await sheetService.writeCell("Products", `E${p._row}`, isActive ? "TRUE" : "FALSE");
}

const productService = { listProducts, createProduct, updateProductStatus };
export default productService;