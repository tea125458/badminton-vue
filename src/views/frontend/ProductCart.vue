<script setup>
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const cart = useCartStore()

const SHIPPING_THRESHOLD = 1000
const SHIPPING_FEE = 100

function shippingFee() {
  return cart.total >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
}

function grandTotal() {
  return cart.total + shippingFee()
}
</script>

<template>
  <div class="cart-page">

    <!-- ====== Navbar ====== -->
    <nav class="cart-navbar front-navbar">
      <span class="navbar-brand text-gradient" style="cursor:pointer" @click="router.push('/products')">
        <i class="bi bi-feather me-2"></i>羽球商城
      </span>
      <button class="back-btn" @click="router.push('/products')">
        <i class="bi bi-arrow-left me-1"></i>繼續購物
      </button>
    </nav>

    <!-- ====== 麵包屑 ====== -->
    <div class="breadcrumb-bar">
      <div class="breadcrumb-inner">
        <span class="bc-item bc-link" @click="router.push('/')">首頁</span>
        <i class="bi bi-chevron-right bc-sep"></i>
        <span class="bc-item bc-link" @click="router.push('/products')">商品</span>
        <i class="bi bi-chevron-right bc-sep"></i>
        <span class="bc-item bc-active">購物車</span>
      </div>
    </div>

    <!-- ====== 主體 ====== -->
    <div class="cart-container">
      <h2 class="cart-page-title">
        <i class="bi bi-cart3 me-2"></i>購物車
        <span class="cart-count-chip">{{ cart.count }} 件</span>
      </h2>

      <!-- 空購物車 -->
      <div v-if="cart.items.length === 0" class="empty-state">
        <i class="bi bi-cart-x empty-icon"></i>
        <p class="empty-text">購物車還沒有商品</p>
        <button class="btn-go-shop" @click="router.push('/products')">
          <i class="bi bi-bag me-2"></i>前往選購
        </button>
      </div>

      <!-- 有商品 -->
      <div v-else class="cart-layout">

        <!-- 左欄：商品清單 -->
        <div class="cart-items-col">
          <div class="cart-items-card">

            <!-- 表頭 -->
            <div class="items-header">
              <span>商品</span>
              <span>單價</span>
              <span>數量</span>
              <span>小計</span>
              <span></span>
            </div>

            <!-- 商品列 -->
            <div v-for="item in cart.items" :key="item.id" class="item-row">
              <!-- 圖片 + 名稱 -->
              <div class="item-product">
                <div class="item-img">
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                  <i v-else class="bi bi-image"></i>
                </div>
                <p class="item-name">{{ item.name }}</p>
              </div>

              <!-- 單價 -->
              <p class="item-unit-price">${{ item.price.toLocaleString() }}</p>

              <!-- 數量 -->
              <div class="qty-control">
                <button class="qty-btn" @click="cart.decrease(item.id)">
                  <i class="bi bi-dash"></i>
                </button>
                <span class="qty-num">{{ item.qty }}</span>
                <button class="qty-btn" @click="cart.increase(item.id)">
                  <i class="bi bi-plus"></i>
                </button>
              </div>

              <!-- 小計 -->
              <p class="item-subtotal">${{ (item.price * item.qty).toLocaleString() }}</p>

              <!-- 刪除 -->
              <button class="item-remove" @click="cart.remove(item.id)">
                <i class="bi bi-trash3"></i>
              </button>
            </div>

          </div>

          <!-- 清空購物車 -->
          <div class="clear-bar">
            <button class="clear-btn" @click="cart.clear()">
              <i class="bi bi-trash3 me-1"></i>清空購物車
            </button>
          </div>
        </div>

        <!-- 右欄：訂單摘要 -->
        <div class="summary-col">
          <div class="summary-card">
            <h5 class="summary-title">訂單摘要</h5>

            <div class="summary-row">
              <span>商品小計</span>
              <span>${{ cart.total.toLocaleString() }}</span>
            </div>

            <div class="summary-row">
              <span>
                運費
                <span v-if="cart.total < SHIPPING_THRESHOLD" class="shipping-hint">
                  （滿 ${{ SHIPPING_THRESHOLD.toLocaleString() }} 免運）
                </span>
                <span v-else class="shipping-free">免運！</span>
              </span>
              <span :class="shippingFee() === 0 ? 'text-success fw-semibold' : ''">
                {{ shippingFee() === 0 ? '免費' : `$${SHIPPING_FEE}` }}
              </span>
            </div>

            <!-- 免運進度條 -->
            <div v-if="cart.total < SHIPPING_THRESHOLD" class="shipping-progress-wrap">
              <div class="shipping-progress-bar">
                <div
                  class="shipping-progress-fill"
                  :style="{ width: Math.min((cart.total / SHIPPING_THRESHOLD) * 100, 100) + '%' }"
                ></div>
              </div>
              <p class="shipping-progress-hint">
                再購買 ${{ (SHIPPING_THRESHOLD - cart.total).toLocaleString() }} 即可免運
              </p>
            </div>

            <hr class="summary-divider" />

            <div class="summary-total-row">
              <span>合計</span>
              <span class="summary-total-price">${{ grandTotal().toLocaleString() }}</span>
            </div>

            <button class="checkout-btn" @click="router.push('/checkout')">
              <i class="bi bi-credit-card me-2"></i>前往結帳
            </button>

            <button class="continue-btn" @click="router.push('/products')">
              <i class="bi bi-arrow-left me-1"></i>繼續購物
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
/* ===== 整體 ===== */
.cart-page {
  min-height: 100vh;
  background: var(--brand-bg);
}

/* ===== Navbar ===== */
.cart-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.back-btn {
  background: transparent;
  border: 1.5px solid var(--brand-teal);
  border-radius: 0.6rem;
  color: var(--brand-teal);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.back-btn:hover {
  background: var(--brand-teal);
  color: white;
}

/* ===== 麵包屑 ===== */
.breadcrumb-bar {
  background: white;
  border-bottom: 1px solid #E2E8F0;
}
.breadcrumb-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
}
.bc-item { color: #94A3B8; }
.bc-link { cursor: pointer; transition: color 0.15s; }
.bc-link:hover { color: var(--brand-sky); }
.bc-active { color: var(--brand-dark); font-weight: 600; }
.bc-sep { font-size: 0.65rem; color: #CBD5E1; }

/* ===== 主體容器 ===== */
.cart-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}
.cart-page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--brand-dark);
  margin-bottom: 1.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.cart-count-chip {
  font-size: 0.78rem;
  font-weight: 700;
  background: #F1F5F9;
  color: #64748B;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  margin-left: 0.25rem;
}

/* ===== 空狀態 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 1rem;
  gap: 1rem;
}
.empty-icon { font-size: 4rem; color: #CBD5E1; }
.empty-text { font-size: 1rem; color: #94A3B8; margin: 0; }
.btn-go-shop {
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  color: white;
  border: none;
  border-radius: 0.75rem;
  padding: 0.7rem 1.75rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-go-shop:hover { opacity: 0.88; }

/* ===== 兩欄佈局 ===== */
.cart-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.75rem;
  align-items: start;
}
@media (max-width: 900px) {
  .cart-layout { grid-template-columns: 1fr; }
}

/* ===== 商品清單卡片 ===== */
.cart-items-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  overflow: hidden;
}
.items-header {
  display: grid;
  grid-template-columns: 1fr 100px 130px 100px 40px;
  gap: 1rem;
  padding: 0.85rem 1.5rem;
  background: #1E293B;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.item-row {
  display: grid;
  grid-template-columns: 1fr 100px 130px 100px 40px;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #F1F5F9;
  transition: background 0.15s;
}
.item-row:last-child { border-bottom: none; }
.item-row:hover { background: #F8FAFC; }

/* 商品欄 */
.item-product {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}
.item-img {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 0.6rem;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #CBD5E1;
  overflow: hidden;
}
.item-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}
.item-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--brand-dark);
  margin: 0;
  line-height: 1.4;
}
.item-unit-price {
  font-size: 0.88rem;
  color: #64748B;
  margin: 0;
}
.item-subtotal {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--brand-teal-dark);
  margin: 0;
}

/* 數量 */
.qty-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.qty-btn {
  width: 30px;
  height: 30px;
  border: 1.5px solid #E2E8F0;
  border-radius: 0.4rem;
  background: white;
  color: #475569;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.qty-btn:hover {
  border-color: var(--brand-sky);
  color: var(--brand-sky);
  background: #F0F9FF;
}
.qty-num {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--brand-dark);
  min-width: 24px;
  text-align: center;
}

/* 刪除 */
.item-remove {
  background: transparent;
  border: none;
  color: #CBD5E1;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}
.item-remove:hover { color: #EF4444; }

/* 清空 */
.clear-bar {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
}
.clear-btn {
  background: transparent;
  border: none;
  color: #94A3B8;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.25rem 0;
  transition: color 0.15s;
}
.clear-btn:hover { color: #EF4444; }

/* ===== 訂單摘要 ===== */
.summary-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 1.5rem;
  position: sticky;
  top: 80px;
}
.summary-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--brand-dark);
  margin-bottom: 1.25rem;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 0.875rem;
  color: #64748B;
  margin-bottom: 0.85rem;
  gap: 0.5rem;
}
.shipping-hint { font-size: 0.72rem; color: #94A3B8; }
.shipping-free { font-size: 0.72rem; color: #10B981; font-weight: 700; }

/* 免運進度條 */
.shipping-progress-wrap { margin-bottom: 0.85rem; }
.shipping-progress-bar {
  height: 6px;
  background: #F1F5F9;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.4rem;
}
.shipping-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-sky), var(--brand-teal));
  border-radius: 9999px;
  transition: width 0.4s ease;
}
.shipping-progress-hint {
  font-size: 0.72rem;
  color: #94A3B8;
  margin: 0;
  text-align: right;
}

.summary-divider { border-color: #F1F5F9; margin: 1rem 0; }
.summary-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  color: var(--brand-dark);
  font-size: 0.95rem;
  margin-bottom: 1.25rem;
}
.summary-total-price {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--brand-teal-dark);
}

.checkout-btn {
  width: 100%;
  padding: 0.9rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-bottom: 0.75rem;
}
.checkout-btn:hover { opacity: 0.88; }

.continue-btn {
  width: 100%;
  padding: 0.75rem;
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 0.75rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}
.continue-btn:hover {
  border-color: var(--brand-dark);
  color: var(--brand-dark);
}

/* ===== 手機版 ===== */
@media (max-width: 767px) {
  .items-header { display: none; }
  .item-row {
    grid-template-columns: 1fr;
    gap: 0.6rem;
    padding: 1rem;
  }
  .item-product { flex-direction: column; align-items: flex-start; }
  .item-unit-price::before { content: '單價：'; color: #94A3B8; font-size: 0.75rem; }
  .item-subtotal::before { content: '小計：'; color: #94A3B8; font-size: 0.75rem; }
  .item-remove { justify-self: end; }
}
</style>
