<script setup>
/**
 * 全域購物車側邊欄
 * 用 Vue 控制顯示/隱藏，不依賴 Bootstrap Offcanvas JS
 * → 徹底解決灰色遮罩殘留問題
 */
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const cart = useCartStore()
const show = defineModel({ type: Boolean, default: false })

const defaultImage = 'http://localhost:8080/images/products/default.png'
function onImageError(e) { e.target.src = defaultImage }

function close() { show.value = false }

function goToCheckout() {
  close()
  router.push('/cart')
}
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩 -->
    <Transition name="fade">
      <div v-if="show" class="cart-backdrop" @click="close"></div>
    </Transition>

    <!-- 側邊欄 -->
    <Transition name="slide">
      <div v-if="show" class="cart-panel">
        <div class="cart-header">
          <h5 class="offcanvas-title fw-bold">
            <i class="bi bi-cart3 me-2"></i>購物車
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="close"></button>
        </div>

        <div class="cart-body">
          <!-- 空購物車 -->
          <div v-if="cart.items.length === 0" class="cart-empty">
            <i class="bi bi-cart-x"></i>
            <p>購物車是空的</p>
          </div>

          <!-- 商品清單 -->
          <ul v-else class="cart-list">
            <li v-for="item in cart.items" :key="item.id" class="cart-item">
              <div class="cart-item-img">
                <img :src="item.imageUrl || defaultImage" :alt="item.name" class="cart-thumb" @error="onImageError" />
              </div>
              <div class="cart-item-info">
                <p class="cart-item-name">{{ item.name }}</p>
                <p class="cart-item-price">${{ item.price.toLocaleString() }}</p>
                <div class="qty-control">
                  <button class="qty-btn" @click="cart.decrease(item.id)"><i class="bi bi-dash"></i></button>
                  <span class="qty-num">{{ item.qty }}</span>
                  <button class="qty-btn" @click="cart.increase(item.id)"><i class="bi bi-plus"></i></button>
                </div>
              </div>
              <div class="cart-item-right">
                <p class="cart-item-subtotal">${{ (item.price * item.qty).toLocaleString() }}</p>
                <button class="remove-btn" @click="cart.remove(item.id)"><i class="bi bi-trash3"></i></button>
              </div>
            </li>
          </ul>
        </div>

        <!-- 結帳區 -->
        <div class="cart-footer">
          <div class="cart-total">
            <span>合計</span>
            <span class="total-price">${{ cart.total.toLocaleString() }}</span>
          </div>
          <button class="btn-brand checkout-btn" :disabled="cart.items.length === 0" @click="goToCheckout">
            <i class="bi bi-credit-card me-2"></i>前往結帳
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 遮罩 */
.cart-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1040;
}

/* 側邊欄 */
.cart-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: 90vw;
  background: white;
  z-index: 1045;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,0.15);
}

.cart-header {
  background: var(--brand-dark, #1E293B);
  color: white;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cart-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

/* 空購物車 */
.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #CBD5E1;
  gap: 0.75rem;
}
.cart-empty i { font-size: 3.5rem; }
.cart-empty p { font-size: 0.95rem; margin: 0; }

/* 購物車清單 */
.cart-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
.cart-item { display: flex; gap: 0.75rem; padding-bottom: 1rem; border-bottom: 1px solid #F1F5F9; }
.cart-item:last-child { border-bottom: none; }
.cart-item-img { width: 64px; height: 64px; border-radius: 0.5rem; background: #F1F5F9; flex-shrink: 0; overflow: hidden; }
.cart-thumb { width: 100%; height: 100%; object-fit: cover; }
.cart-item-info { flex: 1; min-width: 0; }
.cart-item-name { font-size: 0.82rem; font-weight: 600; color: var(--brand-dark); margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cart-item-price { font-size: 0.78rem; color: #94A3B8; margin-bottom: 0.5rem; }
.qty-control { display: flex; align-items: center; gap: 0.5rem; }
.qty-btn { width: 26px; height: 26px; border: 1px solid #E2E8F0; border-radius: 0.4rem; background: white; color: #475569; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; }
.qty-btn:hover { background: #F1F5F9; border-color: var(--brand-sky); color: var(--brand-sky); }
.qty-num { font-size: 0.9rem; font-weight: 700; min-width: 20px; text-align: center; }
.cart-item-right { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; flex-shrink: 0; }
.cart-item-subtotal { font-size: 0.9rem; font-weight: 700; color: var(--brand-teal-dark); margin: 0; }
.remove-btn { background: transparent; border: none; color: #CBD5E1; font-size: 0.9rem; cursor: pointer; padding: 0; transition: color 0.15s ease; }
.remove-btn:hover { color: #EF4444; }

/* 結帳區 */
.cart-footer { padding: 1.25rem 1.5rem; border-top: 1px solid #F1F5F9; background: white; }
.cart-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; font-weight: 600; color: #475569; font-size: 0.95rem; }
.total-price { font-size: 1.35rem; font-weight: 800; color: var(--brand-teal-dark); }
.checkout-btn { width: 100%; border-radius: 0.75rem !important; padding: 0.85rem !important; font-size: 1rem; }
.checkout-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 動畫 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
