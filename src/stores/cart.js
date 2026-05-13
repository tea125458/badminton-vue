/**
 * 購物車 Pinia Store
 *
 * 資料結構設計原則：
 *   欄位名稱直接對齊後端 Products 表 + OrderItems 表，
 *   結帳時可以最少轉換直接送出 API。
 *
 * 購物車 item 結構：
 *   {
 *     productId:   Number,  // 對應 Products.product_id
 *     productName: String,  // 對應 Products.product_name（顯示用）
 *     brand:       String,  // 對應 Products.brand（顯示用）
 *     category:    String,  // 對應 Products.category（找同類用）
 *     imageUrl:    String,  // 對應 Products.image_url（顯示用）
 *     price:       Number,  // 對應 Products.price → 結帳時映射為 OrderItems.unit_price
 *     quantity:    Number,  // 對應 OrderItems.quantity
 *     stockQty:    Number,  // 對應 Products.stock_qty（前端庫存檢查用）
 *   }
 *
 * 持久化：使用 localStorage，key = 'badminton_cart'
 *
 * 商城同學使用方式：
 *   import { useCartStore } from '@/stores/cart'
 *   const cartStore = useCartStore()
 *   cartStore.addItem({ productId, productName, brand, imageUrl, price, quantity, stockQty })
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'badminton_cart'

export const useCartStore = defineStore('cart', () => {

  // ===================== 狀態 =====================
  const items = ref(loadFromStorage())

  // ===================== Getters =====================

  /** 購物車商品總數量（顯示在 Navbar badge 上） */
  const cartCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  /** 購物車總金額 */
  const cartTotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  /** 購物車是否為空 */
  const isEmpty = computed(() => items.value.length === 0)

  // ===================== Actions =====================

  /**
   * 加入購物車
   * - 若商品已存在，累加數量
   * - 若商品不存在，新增一筆
   * @param {Object} product - 商品資料（需含 productId, productName, price, quantity 等）
   */
  function addItem(product) {
    const existing = items.value.find(i => i.productId === product.productId)

    if (existing) {
      const newQty = existing.quantity + (product.quantity || 1)
      // 前端庫存檢查
      if (product.stockQty && newQty > product.stockQty) {
        alert(`庫存不足！「${product.productName}」剩餘 ${product.stockQty} 件`)
        return false
      }
      existing.quantity = newQty
    } else {
      items.value.push({
        productId:   product.productId,
        productName: product.productName,
        brand:       product.brand || '',
        category:    product.category || '',
        imageUrl:    product.imageUrl || '',
        price:       Number(product.price),
        quantity:    product.quantity || 1,
        stockQty:    product.stockQty || 999,
      })
    }

    saveToStorage()
    return true
  }

  /**
   * 更新某商品的數量
   * @param {Number} productId - 商品 ID
   * @param {Number} quantity  - 新數量（必須 >= 1）
   */
  function updateQuantity(productId, quantity) {
    const item = items.value.find(i => i.productId === productId)
    if (!item) return

    if (quantity < 1) return
    if (quantity > item.stockQty) {
      alert(`庫存不足！「${item.productName}」剩餘 ${item.stockQty} 件`)
      return
    }

    item.quantity = quantity
    saveToStorage()
  }

  /**
   * 移除某商品
   * @param {Number} productId - 商品 ID
   */
  function removeItem(productId) {
    items.value = items.value.filter(i => i.productId !== productId)
    saveToStorage()
  }

  /** 清空購物車（結帳成功後呼叫） */
  function clearCart() {
    items.value = []
    saveToStorage()
  }

  // ===================== localStorage 持久化 =====================

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  function loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (e) {
      console.error('讀取購物車快取失敗', e)
      return []
    }
  }

  // ===================== 匯出 =====================
  return {
    items,
    cartCount,
    cartTotal,
    isEmpty,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }
})
