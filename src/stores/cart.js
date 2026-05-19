import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'cart'

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    // localStorage 內容壞掉/被竄改時，當作空購物車，避免整頁白屏
    return []
  }
}

export const useCartStore = defineStore('cart', () => {
  const items = ref(loadItems())

  // 全域購物車側邊欄開關（由 FrontNavbar 渲染 CartOffcanvas，其他頁面可呼叫 openDrawer 打開）
  const drawerOpen = ref(false)
  function openDrawer() {
    drawerOpen.value = true
  }

  watch(
    items,
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {
        // 無痕模式 / 容量已滿：放棄持久化但不影響購物車功能
      }
    },
    { deep: true },
  )

  const total = computed(() => items.value.reduce((sum, i) => sum + i.price * i.qty, 0))
  const count = computed(() => items.value.reduce((sum, i) => sum + i.qty, 0))

  // 取庫存上限；缺值/壞值回傳 Infinity（視為不限制，避免髒資料把數量歸零）
  function stockCap(raw) {
    if (raw == null || raw === '') return Infinity
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : Infinity
  }

  function add(product, qty = 1) {
    const cap = stockCap(product.stockQty)
    const existing = items.value.find((i) => i.id === product.productId)
    if (existing) {
      existing.stock = cap
      existing.qty = Math.min(existing.qty + qty, cap)
    } else {
      items.value.push({
        id: product.productId,
        name: product.productName,
        price: Number(product.price),
        imageUrl: product.imageUrl,
        stock: cap,
        qty: Math.min(qty, cap),
      })
    }
  }

  function increase(id) {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    const cap = Number.isFinite(item.stock) ? item.stock : Infinity
    if (item.qty < cap) item.qty++
  }

  function decrease(id) {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    if (item.qty > 1) item.qty--
    else remove(id)
  }

  function remove(id) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function clear() {
    items.value = []
  }

  return { items, total, count, drawerOpen, openDrawer, add, increase, decrease, remove, clear }
})
