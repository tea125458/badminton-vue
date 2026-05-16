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

  function add(product, qty = 1) {
    const existing = items.value.find((i) => i.id === product.productId)
    if (existing) {
      existing.qty += qty
    } else {
      items.value.push({
        id: product.productId,
        name: product.productName,
        price: Number(product.price),
        imageUrl: product.imageUrl,
        qty,
      })
    }
  }

  function increase(id) {
    const item = items.value.find((i) => i.id === id)
    if (item) item.qty++
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

  return { items, total, count, add, increase, decrease, remove, clear }
})
