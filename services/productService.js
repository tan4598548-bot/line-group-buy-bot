import { 
  getProducts, 
  updateProductDetail, 
  writeCell,
  appendProduct,
  getProductDetail
} from "./sheetService.js";

export async function listProducts() {
  return await getProducts();
}

export async function getDetail(code) {
  return await getProductDetail(code);
}

export async function updateProduct(productCode, data) {
  return await updateProductDetail(productCode, data);
}

export async function createProduct(productData) {
  const formattedData = {
    productCode: `P${Date.now()}`,
    productName: productData.name,
    price: productData.price,
    closeDate: productData.closeDate,
    colorMap: productData.colorMap || "" 
  };
  return await appendProduct(formattedData);
}

export async function updateProductStatus(productCode, isActive) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell("Products", `E${p._row}`, isActive ? "TRUE" : "FALSE");
}

export const toggleProductActive = updateProductStatus;

export async function closeProduct(productCode) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  await writeCell("Products", `H${p._row}`, "TRUE");
}

const productService = {
  listProducts, getDetail, updateProduct, createProduct, 
  updateProductStatus, toggleProductActive, closeProduct
};
export default productService;