<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { productApi } from '@/api/product'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const cart = useCartStore()

const defaultImage = 'http://localhost:8080/images/products/default.png'
function onImageError(e) {
  e.target.src = defaultImage
}

// ===================== 商品資料（從資料庫撈取） =====================
const products = ref([])
const loading = ref(false)
const loadError = ref(null)

async function fetchProducts() {
  loading.value = true
  loadError.value = null
  try {
    const data = await productApi.findAll()
    products.value = data.filter((p) => p.status === 'ACTIVE')
  } catch (e) {
    loadError.value = '無法載入商品，請確認後端服務是否已啟動'
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchProducts)

// ===================== 常數 =====================
const categoryMap = {
  RACKET: '球拍', SHUTTLECOCK: '羽球', GRIP: '握把布',
  STRING: '球線', ACCESSORY: '配件', OTHER: '其他',
}

// ===================== 類別篩選 =====================
const filterCategory = ref('')

// 從已載入商品動態產生有資料的類別清單
const availableCategories = computed(() => {
  const seen = new Set()
  return products.value
    .map((p) => p.category)
    .filter((c) => { if (seen.has(c)) return false; seen.add(c); return true })
})

const filteredProducts = computed(() => {
  if (!filterCategory.value) return products.value
  return products.value.filter((p) => p.category === filterCategory.value)
})

// ===================== 加入購物車確認 Modal =====================
const modal = ref({ show: false, product: null, qty: 1 })
const recPage = ref(0)

const modalSubtotal = computed(() =>
  modal.value.product ? Number(modal.value.product.price) * modal.value.qty : 0
)

// 推薦商品：
// 先決條件：排除購物車已選 & 當前商品 & 零庫存
// 奇數位（1,3,5...）= 同類別，庫存高→低
// 偶數位（2,4,6...）= 不同類別，庫存高→低
// 交叉合併，某邊用完由另一邊補位
const recommendedProducts = computed(() => {
  if (!products.value.length) return []
  const cartIds = new Set(cart.items.map((i) => i.id))
  const currentId = modal.value.product?.productId
  const currentCategory = modal.value.product?.category

  const pool = products.value.filter(
    (p) => p.productId !== currentId && !cartIds.has(p.productId) && p.stockQty > 0
  )
  const byStockDesc = (a, b) => (b.stockQty ?? 0) - (a.stockQty ?? 0)

  const same = pool.filter((p) => p.category === currentCategory).sort(byStockDesc)
  const other = pool.filter((p) => p.category !== currentCategory).sort(byStockDesc)

  // 交叉合併：same → 奇數位，other → 偶數位
  const result = []
  const len = Math.max(same.length, other.length)
  for (let i = 0; i < len; i++) {
    if (i < same.length) result.push(same[i])
    if (i < other.length) result.push(other[i])
  }
  return result
})

const REC_PAGE_SIZE = 3
const recVisible = computed(() =>
  recommendedProducts.value.slice(recPage.value * REC_PAGE_SIZE, (recPage.value + 1) * REC_PAGE_SIZE)
)
const recMaxPage = computed(() =>
  Math.max(0, Math.ceil(recommendedProducts.value.length / REC_PAGE_SIZE) - 1)
)

function openModal(product) {
  modal.value = { show: true, product, qty: 1 }
  recPage.value = 0
}

function closeModal() {
  modal.value.show = false
}

function modalDecreaseQty() {
  if (modal.value.qty > 1) modal.value.qty--
}

function confirmAdd() {
  cart.add(modal.value.product, modal.value.qty)
  closeModal()
}

function goToCart() {
  cart.add(modal.value.product, modal.value.qty)
  closeModal()
}

function goToCheckout() {
  const el = document.getElementById('cartOffcanvas')
  if (el && window.bootstrap) {
    window.bootstrap.Offcanvas.getOrCreateInstance(el).hide()
  }
  router.push('/cart')
}
</script>

<template>
  <div class="browse-page">

    <!-- ====== Navbar ====== -->
    <nav class="browse-navbar front-navbar">
      <span class="navbar-brand text-gradient">
        <i class="bi bi-feather me-2"></i>羽球商城
      </span>
      <button
        class="cart-btn"
        data-bs-toggle="offcanvas"
        data-bs-target="#cartOffcanvas"
      >
        <i class="bi bi-cart3"></i>
        <span v-if="cart.count > 0" class="cart-badge">{{ cart.count }}</span>
      </button>
    </nav>

    <!-- ====== Hero ====== -->
    <div class="browse-hero">
      <span class="badge-teal tracking-widest mb-3 d-inline-block">BADMINTON STORE</span>
      <h1 class="hero-title">精選羽球商品</h1>
      <p class="hero-sub">專業裝備・嚴選品牌・快速到貨</p>
    </div>

    <!-- ====== 商品 Grid ====== -->
    <div class="browse-container">
      <h2 class="section-title">所有商品</h2>

      <!-- 類別篩選按鈕 -->
      <div v-if="products.length > 0" class="category-filter">
        <button
          class="cat-btn"
          :class="{ active: filterCategory === '' }"
          @click="filterCategory = ''"
        >全部</button>
        <button
          v-for="cat in availableCategories"
          :key="cat"
          class="cat-btn"
          :class="{ active: filterCategory === cat }"
          @click="filterCategory = cat"
        >{{ categoryMap[cat] || cat }}</button>
      </div>

      <!-- 載入中 -->
      <div v-if="loading" class="status-center">
        <div class="spinner-border text-info" role="status"></div>
        <p class="mt-3 text-muted">載入商品中…</p>
      </div>

      <!-- 載入失敗 -->
      <div v-else-if="loadError" class="status-center">
        <i class="bi bi-exclamation-circle text-danger" style="font-size:2.5rem"></i>
        <p class="mt-3 text-danger">{{ loadError }}</p>
        <button class="add-btn-sm mt-2" @click="fetchProducts">重新載入</button>
      </div>

      <!-- 沒有商品 -->
      <div v-else-if="products.length === 0" class="status-center">
        <i class="bi bi-box-seam" style="font-size:2.5rem; color:#CBD5E1"></i>
        <p class="mt-3 text-muted">目前沒有上架商品</p>
      </div>

      <!-- 商品清單 -->
      <div v-else class="row g-4">
        <div
          v-for="product in filteredProducts"
          :key="product.productId"
          class="col-6 col-md-4 col-lg-3"
        >
          <div class="product-card card-rounded hover-lift">
            <!-- 商品圖片 -->
            <div class="img-zoom product-img-wrap">
              <img
                :src="product.imageUrl || defaultImage"
                :alt="product.productName"
                class="product-img"
                @error="onImageError"
              />

              <!-- 右上角庫存 badge -->
              <span v-if="product.stockQty === 0" class="stock-badge stock-badge--empty">缺貨中</span>
              <span v-else-if="product.stockQty < 5" class="stock-badge stock-badge--low">少量庫存</span>
            </div>

            <!-- 下方橫幅 -->
            <div v-if="product.stockQty === 0" class="stock-banner stock-banner--empty">
              <i class="bi bi-clock-history me-1"></i>熱銷完售，補貨中
            </div>
            <div v-else-if="product.stockQty < 5" class="stock-banner stock-banner--low">
              <i class="bi bi-fire me-1"></i>熱銷中
            </div>

            <!-- 商品資訊 -->
            <div class="product-body">
              <span class="badge-teal tracking-wide mb-2">{{ categoryMap[product.category] || product.category }}</span>
              <p class="product-brand">{{ product.brand }}</p>
              <h6 class="product-name line-clamp-2">{{ product.productName }}</h6>
              <div class="product-footer">
                <span class="product-price">${{ Number(product.price).toLocaleString() }}</span>
                <button
                  class="add-btn-sm"
                  @click="openModal(product)"
                  :disabled="product.stockQty === 0"
                >
                  <i class="bi bi-cart-plus me-1"></i>加入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 購物車 Offcanvas ====== -->
    <div
      id="cartOffcanvas"
      class="offcanvas offcanvas-end cart-offcanvas"
      tabindex="-1"
    >
      <div class="offcanvas-header cart-header">
        <h5 class="offcanvas-title fw-bold">
          <i class="bi bi-cart3 me-2"></i>購物車
        </h5>
        <button
          type="button"
          class="btn-close btn-close-white"
          data-bs-dismiss="offcanvas"
        ></button>
      </div>

      <div class="offcanvas-body cart-body">
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
                <button class="qty-btn" @click="cart.decrease(item.id)">
                  <i class="bi bi-dash"></i>
                </button>
                <span class="qty-num">{{ item.qty }}</span>
                <button class="qty-btn" @click="cart.increase(item.id)">
                  <i class="bi bi-plus"></i>
                </button>
              </div>
            </div>
            <div class="cart-item-right">
              <p class="cart-item-subtotal">${{ (item.price * item.qty).toLocaleString() }}</p>
              <button class="remove-btn" @click="cart.remove(item.id)">
                <i class="bi bi-trash3"></i>
              </button>
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

    <!-- ====== 加入購物車確認 Modal ====== -->
    <Transition name="modal">
      <div v-if="modal.show" class="modal-overlay" @click.self="closeModal">
        <div class="cart-modal">

          <!-- 標題 + 關閉 -->
          <div class="cart-modal-header">
            <h5 class="cart-modal-title">購物車</h5>
            <button class="cart-modal-close" @click="closeModal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <hr class="cart-modal-divider" />

          <!-- 商品列 -->
          <div class="cart-modal-item">
            <div class="cart-modal-img">
              <img :src="modal.product?.imageUrl || defaultImage" :alt="modal.product?.productName" @error="onImageError" />
            </div>
            <div class="cart-modal-info">
              <p class="cart-modal-name">{{ modal.product?.productName }}</p>
              <p class="cart-modal-brand">{{ categoryMap[modal.product?.category] || modal.product?.category }}</p>
            </div>
            <div class="cart-modal-qty-wrap">
              <span class="cart-modal-qty-label">數量</span>
              <div class="qty-control">
                <button class="qty-btn" @click="modalDecreaseQty"><i class="bi bi-dash"></i></button>
                <span class="qty-num">{{ modal.qty }}</span>
                <button class="qty-btn" @click="modal.qty++"><i class="bi bi-plus"></i></button>
              </div>
            </div>
            <p class="cart-modal-subtotal">NT${{ modalSubtotal.toLocaleString() }}</p>
          </div>

          <!-- 操作按鈕 -->
          <div class="cart-modal-actions">
            <button class="cart-modal-continue" @click="confirmAdd">繼續購物</button>
            <button class="btn-brand cart-modal-go" @click="goToCart">加入購物車</button>
          </div>

          <!-- 推薦商品 -->
          <template v-if="recommendedProducts.length > 0">
            <hr class="cart-modal-divider" />
            <div class="rec-section">
              <h6 class="rec-title">你也會有興趣...</h6>
              <div class="rec-carousel">
                <button
                  class="rec-arrow rec-arrow-prev"
                  :disabled="recPage === 0"
                  @click="recPage--"
                >
                  <i class="bi bi-chevron-left"></i>
                </button>

                <div class="rec-grid">
                  <div v-for="p in recVisible" :key="p.productId" class="rec-card">
                    <div class="rec-img-wrap">
                      <img :src="p.imageUrl || defaultImage" :alt="p.productName" class="rec-img" @error="onImageError" />
                    </div>
                    <p class="rec-name">{{ p.productName }}</p>
                    <p class="rec-desc">{{ p.brand }}</p>
                    <button class="rec-cart-btn" @click="openModal(p)">
                      <i class="bi bi-cart-plus me-1"></i>加入購物車
                    </button>
                  </div>
                </div>

                <button
                  class="rec-arrow rec-arrow-next"
                  :disabled="recPage >= recMaxPage"
                  @click="recPage++"
                >
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          </template>

        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* ===== 整體 ===== */
.browse-page {
  min-height: 100vh;
  background: var(--brand-bg);
}

/* ===== Navbar（在 front-navbar 基礎上補 sticky + flex） ===== */
.browse-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.cart-btn {
  position: relative;
  background: transparent;
  border: 2px solid var(--brand-teal);
  border-radius: 0.75rem;
  color: var(--brand-teal);
  font-size: 1.35rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cart-btn:hover {
  background: var(--brand-teal);
  color: white;
}
.cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #EF4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* ===== Hero ===== */
.browse-hero {
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal-dark));
  color: white;
  text-align: center;
  padding: 3.5rem 1rem;
}
.hero-title {
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}
.hero-sub {
  font-size: 1rem;
  opacity: 0.85;
  margin: 0;
}

/* ===== 商品 Grid ===== */
.browse-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

/* ===== 類別篩選按鈕 ===== */
.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.75rem;
}
.cat-btn {
  padding: 0.4rem 1.1rem;
  border: 1.5px solid #E2E8F0;
  border-radius: 9999px;
  background: white;
  color: #64748B;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cat-btn:hover {
  border-color: var(--brand-teal);
  color: var(--brand-teal);
}
.cat-btn.active {
  background: var(--brand-teal);
  border-color: var(--brand-teal);
  color: white;
}

/* ===== 商品卡片（card-rounded + hover-lift 來自 frontend.css） ===== */
.product-card {
  background: white;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  height: 100%;
  display: flex;
  flex-direction: column;
}
.product-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

/* 右上角庫存 badge */
.stock-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  z-index: 1;
  letter-spacing: 0.03em;
}
.stock-badge--empty {
  background: rgba(241, 245, 249, 0.92);
  color: #94A3B8;
}
.stock-badge--low {
  background: rgba(254, 243, 199, 0.95);
  color: #D97706;
}

/* 下方橫幅 */
.stock-banner {
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
  padding: 0.3rem 1rem;
}
.stock-banner--empty {
  background: #F1F5F9;
  color: #94A3B8;
}
.stock-banner--low {
  background: #FEF3C7;
  color: #B45309;
}
.product-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--brand-bg);
  padding: 0.5rem;
}
.product-img-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #F1F5F9, #E2E8F0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #CBD5E1;
}

/* 載入中 / 錯誤 / 空狀態 */
.status-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
}

.product-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.product-brand {
  font-size: 0.72rem;
  color: #94A3B8;
  font-weight: 600;
  margin: 0.3rem 0 0.25rem;
}
.product-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--brand-dark);
  line-height: 1.4;
  margin-bottom: 1rem;
  flex: 1;
}
.product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.product-price {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--brand-teal-dark);
}
.add-btn-sm {
  background: var(--brand-teal);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  white-space: nowrap;
}
.add-btn-sm:hover:not(:disabled) {
  background: var(--brand-teal-dark);
}
.add-btn-sm:disabled {
  background: #E2E8F0;
  color: #94A3B8;
  cursor: not-allowed;
}

/* ===== 購物車 Offcanvas ===== */
.cart-offcanvas {
  width: 380px !important;
  display: flex;
  flex-direction: column;
}
.cart-header {
  background: var(--brand-dark);
  color: white;
  padding: 1.25rem 1.5rem;
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
.cart-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cart-item {
  display: flex;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #F1F5F9;
}
.cart-item:last-child { border-bottom: none; }
.cart-item-img {
  width: 64px;
  height: 64px;
  border-radius: 0.5rem;
  background: #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #CBD5E1;
  flex-shrink: 0;
  overflow: hidden;
}
.cart-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cart-item-info { flex: 1; min-width: 0; }
.cart-item-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--brand-dark);
  margin-bottom: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cart-item-price {
  font-size: 0.78rem;
  color: #94A3B8;
  margin-bottom: 0.5rem;
}
.qty-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.qty-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #E2E8F0;
  border-radius: 0.4rem;
  background: white;
  color: #475569;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.qty-btn:hover {
  background: var(--brand-border);
  border-color: var(--brand-sky);
  color: var(--brand-sky);
}
.qty-num {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--brand-dark);
  min-width: 20px;
  text-align: center;
}
.cart-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  flex-shrink: 0;
}
.cart-item-subtotal {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--brand-teal-dark);
  margin: 0;
}
.remove-btn {
  background: transparent;
  border: none;
  color: #CBD5E1;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease;
}
.remove-btn:hover { color: #EF4444; }

/* 結帳區 */
.cart-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #F1F5F9;
  background: white;
}
.cart-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-weight: 600;
  color: #475569;
  font-size: 0.95rem;
}
.total-price {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--brand-teal-dark);
}
/* btn-brand 來自 frontend.css，這裡只補 full-width 和 disabled */
.checkout-btn {
  width: 100%;
  border-radius: 0.75rem !important;
  padding: 0.85rem !important;
  font-size: 1rem;
}
.checkout-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== 加入購物車確認 Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.cart-modal {
  background: white;
  border-radius: var(--brand-card-radius);
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem 2rem 1.75rem;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
}
.cart-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cart-modal-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--brand-dark);
  margin: 0;
}
.cart-modal-close {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  color: #94A3B8;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.15s ease;
}
.cart-modal-close:hover { color: var(--brand-dark); }
.cart-modal-divider {
  border-color: #E2E8F0;
  margin: 1.25rem 0;
}

/* 商品列 */
.cart-modal-item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}
.cart-modal-img {
  width: 88px;
  height: 88px;
  border-radius: 0.6rem;
  background: var(--brand-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  color: #CBD5E1;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid #E2E8F0;
}
.cart-modal-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.3rem;
}
.cart-modal-info {
  flex: 1;
  min-width: 0;
}
.cart-modal-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--brand-dark);
  margin-bottom: 0.25rem;
  line-height: 1.4;
}
.cart-modal-brand {
  font-size: 0.82rem;
  color: #94A3B8;
  margin: 0;
}
.cart-modal-qty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}
.cart-modal-qty-label {
  font-size: 0.72rem;
  color: #94A3B8;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.cart-modal-subtotal {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--brand-dark);
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 90px;
  text-align: right;
}

/* 操作按鈕 */
.cart-modal-actions {
  display: flex;
  gap: 0.75rem;
}
.cart-modal-continue {
  flex: 1;
  padding: 0.8rem;
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cart-modal-continue:hover {
  border-color: var(--brand-dark);
  color: var(--brand-dark);
}
.cart-modal-go {
  flex: 1;
  border-radius: 0.75rem !important;
  padding: 0.8rem !important;
  font-size: 0.95rem;
  text-align: center;
}

/* ===== 推薦商品 ===== */
.rec-section { }
.rec-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--brand-dark);
  margin-bottom: 1.25rem;
}
.rec-carousel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.rec-arrow {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--brand-dark);
  font-size: 0.8rem;
  transition: all 0.15s;
}
.rec-arrow:hover:not(:disabled) {
  background: var(--brand-dark);
  color: white;
  border-color: var(--brand-dark);
}
.rec-arrow:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}
.rec-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.rec-card { }
.rec-img-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--brand-bg);
  border: 1px solid #E2E8F0;
  border-radius: 0.5rem;
  overflow: hidden;
  margin-bottom: 0.6rem;
}
.rec-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.5rem;
}
.rec-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #CBD5E1;
}
.rec-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--brand-dark);
  margin-bottom: 0.2rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rec-desc {
  font-size: 0.72rem;
  color: #94A3B8;
  margin-bottom: 0.5rem;
}
.rec-cart-btn {
  width: 100%;
  padding: 0.35rem 0;
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}
.rec-cart-btn:hover {
  background: var(--brand-teal);
  border-color: var(--brand-teal);
  color: white;
}

/* Modal 進出場動畫 */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .cart-modal,
.modal-leave-active .cart-modal { transition: transform 0.25s ease, opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-from .cart-modal { transform: translateY(16px); opacity: 0; }
.modal-leave-to .cart-modal { transform: translateY(8px); opacity: 0; }

/* 手機版 */
@media (max-width: 575.98px) {
  .cart-modal { padding: 1.5rem 1.25rem 1.25rem; }
  .cart-modal-item { flex-wrap: wrap; }
  .cart-modal-subtotal { width: 100%; text-align: right; }
  .rec-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
