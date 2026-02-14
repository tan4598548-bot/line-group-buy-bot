import { 
  getProducts, 
  updateProductDetail, 
  writeCell 
} from "./sheetService.js";

/**
 * 取得所有商品清單
 */
export async function listProducts() {
  return await getProducts();
}

/**
 * 更新商品資訊
 */
export async function updateProduct(productCode, data) {
  return await updateProductDetail(productCode, data);
}

/**
 * 切換商品上架狀態
 */
export async function toggleProductActive(productCode, isActive) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  
  // 假設 active 欄位在第 E 欄 (第 5 欄)
  await writeCell("Products", `E${p._row}`, isActive ? "TRUE" : "FALSE");
}

/**
 * 結單處理
 */
export async function closeProduct(productCode) {
  const products = await getProducts();
  const p = products.find(p => p.productCode === productCode);
  if (!p) throw new Error("商品不存在");
  
  // 假設 closed 欄位在第 H 欄 (或其他指定欄位)
  await writeCell("Products", `H${p._row}`, "TRUE");
}

// 建立物件供預設匯出
const productService = {
  listProducts,
  updateProduct,
  toggleProductActive,
  closeProduct
};

// 解決 SyntaxError 的關鍵：預設匯出
export default productService;