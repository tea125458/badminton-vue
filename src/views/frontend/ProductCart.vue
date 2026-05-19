<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useMemberStore } from '@/stores/member'
import { productApi } from '@/api/product'
import AuthModal from '@/components/frontend/AuthModal.vue'

const router = useRouter()
const cart = useCartStore()
const memberStore = useMemberStore()

const defaultImage = 'http://localhost:8080/images/products/default.png'
function onImageError(e) {
  e.target.src = defaultImage
}

// ===================== 猜你喜歡（商品推薦） =====================
const allProducts = ref([])

onMounted(async () => {
  try {
    const data = await productApi.findAll()
    allProducts.value = data.filter((p) => p.status === 'ACTIVE')
  } catch (e) {
    console.error(e)
  }
})

// 推薦邏輯：
// 排除購物車已有 & 缺貨商品
// 優先推「與購物車同類別」的商品（庫存高→低）
// 再補上有行銷標籤的商品：精選 → 熱銷 → 促銷（庫存高→低）
// 交叉合併並去重，最多顯示 4 筆
const recommendedProducts = computed(() => {
  if (!allProducts.value.length) return []

  const cartIds = new Set(cart.items.map((i) => i.id))
  const cartCategories = new Set(
    allProducts.value
      .filter((p) => cartIds.has(p.productId))
      .map((p) => p.category),
  )

  const pool = allProducts.value.filter(
    (p) => !cartIds.has(p.productId) && p.stockQty > 0,
  )
  const byStockDesc = (a, b) => (b.stockQty ?? 0) - (a.stockQty ?? 0)

  const sameCategory = pool
    .filter((p) => cartCategories.has(p.category))
    .sort(byStockDesc)

  const tagOrder = { 精選: 0, 熱銷: 1, 促銷: 2 }
  const marketing = pool
    .filter((p) => p.marketingTag in tagOrder)
    .sort((a, b) => {
      const t = tagOrder[a.marketingTag] - tagOrder[b.marketingTag]
      return t !== 0 ? t : byStockDesc(a, b)
    })

  const result = []
  const seen = new Set()
  const len = Math.max(sameCategory.length, marketing.length)
  for (let i = 0; i < len; i++) {
    for (const p of [sameCategory[i], marketing[i]]) {
      if (p && !seen.has(p.productId)) {
        seen.add(p.productId)
        result.push(p)
      }
    }
  }
  return result.slice(0, 9)
})

// 分頁（比照購物車彈跳視窗的推薦輪播：一次 3 個）
const recPage = ref(0)
const REC_PAGE_SIZE = 3
const recVisible = computed(() =>
  recommendedProducts.value.slice(
    recPage.value * REC_PAGE_SIZE,
    (recPage.value + 1) * REC_PAGE_SIZE,
  ),
)
const recMaxPage = computed(() =>
  Math.max(0, Math.ceil(recommendedProducts.value.length / REC_PAGE_SIZE) - 1),
)

const marketingBadgeMap = {
  精選: { label: '精選', cls: 'rec-tag--featured' },
  熱銷: { label: '熱銷', cls: 'rec-tag--hot' },
  促銷: { label: '促銷', cls: 'rec-tag--sale' },
}

function addRecToCart(product) {
  cart.add(product, 1)
}

// ===================== 商品詳情 Modal（複製自 ProductBrowse.vue） =====================
const categoryMap = {
  RACKET: '球拍', SHUTTLECOCK: '羽球',
  SHOES: '球鞋', GRIP: '握把布',
  STRING: '球線', ACCESSORY: '配件', OTHER: '其他',
}

const detailModal = ref({ show: false, product: null })

const marketingBadge = computed(() => {
  const map = {
    精選: { label: '天晴精選', cls: 'mtag-featured' },
    熱銷: { label: '熱銷首選', cls: 'mtag-hot' },
    促銷: { label: '降價促銷', cls: 'mtag-sale' },
  }
  return map[detailModal.value.product?.marketingTag] || null
})

function openDetailModal(product) {
  detailModal.value = { show: true, product }
}

// 購物車列只存精簡欄位，用 id 對回完整商品再開詳情視窗
function openDetailFromCartItem(item) {
  const product = allProducts.value.find((p) => p.productId === item.id)
  if (product) openDetailModal(product)
}

function closeDetailModal() {
  detailModal.value.show = false
}

function openCartFromDetail() {
  cart.add(detailModal.value.product, 1)
  closeDetailModal()
}

const SHIPPING_THRESHOLD = 2000
const SHIPPING_FEE = 100

function shippingFee() {
  return cart.total >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
}

function grandTotal() {
  return cart.total + shippingFee()
}

function atStockMax(item) {
  return Number.isFinite(item.stock) && item.qty >= item.stock
}

// ===================== 登入檢查（共用 AuthModal + memberStore） =====================
const showAuthModal = ref(false)

// 「前往結帳」：已登入直接結帳，未登入先彈登入視窗
function goCheckout() {
  if (memberStore.isLoggedIn) {
    router.push('/checkout')
  } else {
    showAuthModal.value = true
  }
}

// AuthModal 登入/註冊成功 → 自動接著去結帳
function onAuthSuccess() {
  router.push('/checkout')
}
</script>

<template>
  <div class="cart-page">

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
                <p class="item-name item-name--link" @click="openDetailFromCartItem(item)">{{ item.name }}</p>
              </div>

              <!-- 單價 -->
              <p class="item-unit-price">${{ item.price.toLocaleString() }}</p>

              <!-- 數量 -->
              <div class="qty-control">
                <button class="qty-btn" @click="cart.decrease(item.id)">
                  <i class="bi bi-dash"></i>
                </button>
                <span class="qty-num">{{ item.qty }}</span>
                <button class="qty-btn" :disabled="atStockMax(item)" @click="cart.increase(item.id)">
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

          <!-- ====== 猜你喜歡 ====== -->
          <div
            v-if="recommendedProducts.length > 0"
            class="rec-section"
          >
            <h3 class="rec-section-title">
              <i class="bi bi-stars me-2"></i>猜你喜歡
            </h3>
            <div class="rec-carousel">
              <button
                class="rec-arrow"
                :disabled="recPage === 0"
                @click="recPage--"
              >
                <i class="bi bi-chevron-left"></i>
              </button>

              <div class="rec-grid">
                <div
                  v-for="p in recVisible"
                  :key="p.productId"
                  class="rec-card rec-card--clickable"
                  @click="openDetailModal(p)"
                >
                  <div class="rec-img-wrap">
                    <img
                      :src="p.imageUrl || defaultImage"
                      :alt="p.productName"
                      class="rec-img"
                      @error="onImageError"
                    />
                    <span
                      v-if="marketingBadgeMap[p.marketingTag]"
                      class="rec-tag"
                      :class="marketingBadgeMap[p.marketingTag].cls"
                    >{{ marketingBadgeMap[p.marketingTag].label }}</span>
                  </div>
                  <p class="rec-brand">{{ p.brand }}</p>
                  <p class="rec-name">{{ p.productName }}</p>
                  <div class="rec-footer">
                    <span class="rec-price">${{ Number(p.price).toLocaleString() }}</span>
                    <button class="rec-cart-btn" @click.stop="addRecToCart(p)">
                      <i class="bi bi-cart-plus me-1"></i>加入
                    </button>
                  </div>
                </div>
              </div>

              <button
                class="rec-arrow"
                :disabled="recPage >= recMaxPage"
                @click="recPage++"
              >
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 右欄：訂單摘要 -->
        <div class="summary-col">
          <div class="summary-card">
            <h5 class="summary-title">訂單摘要</h5>

            <p class="summary-count">
              {{ cart.items.length }} 項商品，共 {{ cart.count }} 件
            </p>

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

            <button class="checkout-btn" @click="goCheckout">
              <i class="bi bi-credit-card me-2"></i>前往結帳
            </button>

            <button class="continue-btn" @click="router.push('/products')">
              <i class="bi bi-arrow-left me-1"></i>繼續購物
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ====== 信任卡片 ====== -->
    <div class="trust-bar">
      <div class="trust-card">
        <i class="bi bi-shop-window trust-icon"></i>
        <p class="trust-title">球館自取</p>
        <p class="trust-desc">打球順便取貨</p>
      </div>
      <div class="trust-card">
        <i class="bi bi-shield-check trust-icon"></i>
        <p class="trust-title">品質保證</p>
        <p class="trust-desc">原廠授權商品</p>
      </div>
      <div class="trust-card">
        <i class="bi bi-arrow-repeat trust-icon"></i>
        <p class="trust-title">七天鑑賞</p>
        <p class="trust-desc">不滿意七天內隨時退換</p>
      </div>
    </div>

    <!-- ====== 商品詳情 Modal（複製自 ProductBrowse.vue） ====== -->
    <Transition name="modal">
      <div v-if="detailModal.show" class="modal-overlay" @click.self="closeDetailModal">
        <div class="detail-modal">

          <!-- 標題 + 關閉 -->
          <div class="detail-modal-header">
            <h5 class="detail-modal-title">商品詳情</h5>
            <button class="cart-modal-close" @click="closeDetailModal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <hr class="cart-modal-divider" />

          <!-- 內容區：左圖 + 右資訊 -->
          <div class="detail-modal-body">
            <!-- 左：商品圖片 -->
            <div class="detail-modal-img-wrap">
              <img
                :src="detailModal.product?.imageUrl || defaultImage"
                :alt="detailModal.product?.productName"
                class="detail-modal-img"
                @error="onImageError"
              />
            </div>

            <!-- 右：商品資訊 -->
            <div class="detail-modal-info">
              <div class="detail-category-row">
                <span class="badge-teal detail-category-badge tracking-wide d-inline-block">
                  {{ categoryMap[detailModal.product?.category] || detailModal.product?.category }}
                </span>
                <span v-if="marketingBadge" class="detail-marketing-badge" :class="marketingBadge.cls">
                  {{ marketingBadge.label }}
                </span>
              </div>
              <p class="detail-modal-brand">{{ detailModal.product?.brand }}</p>
              <h4 class="detail-modal-name">{{ detailModal.product?.productName }}</h4>
              <p class="detail-modal-price">${{ Number(detailModal.product?.price).toLocaleString() }}</p>

              <!-- 規格 -->
              <div v-if="detailModal.product?.spec" class="detail-modal-desc-wrap">
                <p class="detail-modal-desc-label">規格</p>
                <p class="detail-modal-desc">{{ detailModal.product?.spec }}</p>
              </div>

              <!-- 商品描述 -->
              <div v-if="detailModal.product?.description" class="detail-modal-desc-wrap">
                <p class="detail-modal-desc-label">商品介紹</p>
                <p class="detail-modal-desc">{{ detailModal.product?.description }}</p>
              </div>

              <!-- 庫存狀態 -->
              <div class="detail-modal-stock">
                <i
                  :class="detailModal.product?.stockQty === 0 ? 'bi bi-x-circle text-danger' : 'bi bi-check-circle text-success'"
                  class="me-1"
                ></i>
                <span v-if="detailModal.product?.stockQty === 0" class="text-danger">無庫存，補貨中</span>
                <span v-else-if="detailModal.product?.stockQty <= 10" class="stock-low-text">僅剩 {{ detailModal.product?.stockQty }} 件</span>
                <span v-else class="text-success">現貨充足</span>
              </div>

              <!-- 加入購物車按鈕 -->
              <button
                class="detail-modal-cart-btn btn-brand"
                :disabled="detailModal.product?.stockQty === 0"
                @click="openCartFromDetail"
              >
                <i class="bi bi-cart-plus me-2"></i>加入購物車
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>

    <!-- ====== 登入彈窗（未登入按「前往結帳」時出現，用共用 AuthModal） ====== -->
    <AuthModal v-model="showAuthModal" @login-success="onAuthSuccess" />

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
  font-size: 1rem;
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
  font-size: 0.95rem;
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
  font-size: 1rem;
  font-weight: 600;
  color: var(--brand-dark);
  margin: 0;
  line-height: 1.4;
}
.item-unit-price {
  font-size: 1rem;
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
.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.qty-btn:disabled:hover {
  border-color: #E2E8F0;
  color: #475569;
  background: white;
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
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--brand-dark);
  margin-bottom: 1.25rem;
}
.summary-count {
  font-size: 0.95rem;
  color: #94A3B8;
  margin: -0.75rem 0 1rem;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 1rem;
  color: #64748B;
  margin-bottom: 0.85rem;
  gap: 0.5rem;
}
.shipping-hint { font-size: 0.85rem; color: #94A3B8; }
.shipping-free { font-size: 0.85rem; color: #10B981; font-weight: 700; }

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
  font-size: 1.1rem;
  margin-bottom: 1.25rem;
}
.summary-total-price {
  font-size: 1.75rem;
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
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}
.continue-btn:hover {
  border-color: var(--brand-dark);
  color: var(--brand-dark);
}

/* ===== 信任卡片 ===== */
.trust-bar {
  max-width: 1200px;
  margin: 0 auto 3rem;
  padding: 0 1.5rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.trust-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 1.5rem 1rem;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}
.trust-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
}
.trust-icon {
  font-size: 1.8rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: block;
  margin-bottom: 0.6rem;
}
.trust-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--brand-dark);
  margin: 0 0 0.25rem;
}
.trust-desc {
  font-size: 0.78rem;
  color: #94A3B8;
  margin: 0;
}
@media (max-width: 600px) {
  .trust-bar { grid-template-columns: 1fr; }
}

/* ===== 猜你喜歡 ===== */
.rec-section {
  margin-top: 1.25rem;
}
.rec-section-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--brand-dark);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}
.rec-carousel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.rec-arrow {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--brand-dark);
  font-size: 0.85rem;
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
  gap: 1.25rem;
  align-items: stretch;
}
.rec-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}
.rec-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
}
.rec-img-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--brand-bg);
  border: 1px solid #E2E8F0;
  border-radius: 0.6rem;
  overflow: hidden;
  margin-bottom: 0.65rem;
}
.rec-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.5rem;
}
.rec-tag {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  color: white;
  letter-spacing: 0.05em;
}
.rec-tag--featured { background: #0EA5E9; }
.rec-tag--hot { background: #F59E0B; }
.rec-tag--sale { background: #DC2626; }
.rec-brand {
  font-size: 0.72rem;
  color: #94A3B8;
  font-weight: 600;
  margin: 0 0 0.2rem;
}
.rec-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--brand-dark);
  line-height: 1.4;
  margin: 0 0 0.65rem;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rec-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.rec-price {
  font-size: 1rem;
  font-weight: 800;
  color: var(--brand-teal-dark);
}
.rec-cart-btn {
  background: var(--brand-teal);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  white-space: nowrap;
}
.rec-cart-btn:hover { background: var(--brand-teal-dark); }
@media (max-width: 900px) {
  .rec-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .rec-grid { grid-template-columns: 1fr; }
}

.rec-card--clickable { cursor: pointer; }
.item-name--link { cursor: pointer; transition: color 0.15s; }
.item-name--link:hover { color: var(--brand-teal); }

/* ===== 商品詳情 Modal（複製自 ProductBrowse.vue） ===== */
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
.detail-modal {
  background: white;
  border-radius: var(--brand-card-radius);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem 2rem 2rem;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
}
.detail-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-modal-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--brand-dark);
  margin: 0;
}
.detail-modal-body {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}
.detail-modal-img-wrap {
  position: relative;
  flex: 0 0 60%;
  aspect-ratio: 1 / 1;
  border-radius: 0.75rem;
  background: var(--brand-bg);
  border: 1px solid #E2E8F0;
  overflow: hidden;
}
.detail-modal-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.75rem;
}
.detail-modal-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.detail-category-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.detail-category-badge {
  font-size: 1.0rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  line-height: 1.2;
}
.detail-marketing-badge {
  font-size: 1.0rem;
  font-weight: 500;
  padding: 0.35rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 9999px;
  letter-spacing: 0.05em;
  line-height: 1.2;
}
.mtag-featured { background: #E0F2FE; color: #0369A1; }
.mtag-hot { background: #FEF3C7; color: #B45309; }
.mtag-sale { background: #FEE2E2; color: #DC2626; }
.detail-modal-brand {
  font-size: 0.85rem;
  color: #94A3B8;
  font-weight: 600;
  margin: 0.5rem 0 0.35rem;
}
.detail-modal-name {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--brand-dark);
  line-height: 1.4;
  margin-bottom: 0.75rem;
}
.detail-modal-price {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--brand-teal-dark);
  margin-bottom: 1rem;
}
.detail-modal-desc-wrap {
  background: #F8FAFC;
  border-left: 3px solid var(--brand-teal);
  border-radius: 0 0.4rem 0.4rem 0;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}
.detail-modal-desc-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--brand-teal-dark);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
}
.detail-modal-desc {
  font-size: 1rem;
  color: #475569;
  line-height: 1.65;
  margin: 0;
  white-space: pre-line;
}
.detail-modal-stock {
  font-size: 0.95rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
}
.stock-low-text {
  color: #D97706;
  font-size: 0.95rem;
  font-weight: 400;
}
.detail-modal-cart-btn {
  width: 100%;
  border-radius: 0.75rem !important;
  padding: 0.85rem !important;
  font-size: 1rem;
  font-weight: 700;
}
.detail-modal-cart-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
@media (max-width: 575.98px) {
  .detail-modal { padding: 1.5rem 1.25rem; }
  .detail-modal-body { flex-direction: column; gap: 1.25rem; }
  .detail-modal-img-wrap { flex: none; width: 100%; height: 220px; aspect-ratio: auto; }
}

/* Modal 進出場動畫 */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .detail-modal,
.modal-leave-active .detail-modal { transition: transform 0.25s ease, opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-from .detail-modal { transform: translateY(16px); opacity: 0; }
.modal-leave-to .detail-modal { transform: translateY(8px); opacity: 0; }

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
