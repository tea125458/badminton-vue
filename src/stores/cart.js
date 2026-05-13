import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])

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
