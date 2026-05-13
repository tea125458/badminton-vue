<script setup>
/**
 * 購物車頁面
 *
 * 功能：
 * 1. 讀取 Pinia cart store 顯示購物車內容
 * 2. 修改數量（+/- 按鈕）
 * 3. 移除商品
 * 4. 顯示總金額
 * 5. 前往結帳 / 繼續逛商城
 * 6. 空購物車時顯示推薦商品（從後端 API 取得）
 */
import { ref, onMounted } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useRouter } from 'vue-router'
import { productApi } from '@/api/product'

const cart = useCartStore()
const scrollContainer = ref(null)
const router = useRouter()

// 推薦商品（空購物車時顯示）
const recommendedProducts = ref([])
const loadingProducts = ref(false)

// 「更多好物」同類商品（購物車有商品時）
const allProducts = ref([])
const similarMap = ref({})       // { productId: [products...] }
const expandedSimilar = ref(null) // 目前展開的 productId

onMounted(async () => {
  try {
    const all = await productApi.findAll()
    allProducts.value = all.filter(p => p.status === 'ACTIVE' && p.stockQty > 0)
    if (cart.isEmpty) {
      loadingProducts.value = true
      recommendedProducts.value = allProducts.value
      loadingProducts.value = false
    }
  } catch (e) {
    console.error('載入商品失敗', e)
  }
})

function addRecommendedToCart(product) {
  const success = cart.addItem({
    productId: product.productId,
    productName: product.productName,
    brand: product.brand || '',
    category: product.category || '',
    imageUrl: product.imageUrl || '',
    price: product.price,
    quantity: 1,
    stockQty: product.stockQty,
  })
  if (success) {
    alert(`「${product.productName}」已加入購物車！`)
  }
}

// 切換「更多好物」展開區
function toggleSimilar(item) {
  if (expandedSimilar.value === item.productId) {
    expandedSimilar.value = null
    return
  }
  expandedSimilar.value = item.productId

  // 如果還沒查過同類商品，用 category 篩選
  if (!similarMap.value[item.productId]) {
    const category = item.category
    similarMap.value[item.productId] = allProducts.value
      .filter(p => p.category === category && p.productId !== item.productId)
      .slice(0, 8)
  }
}

function goToCheckout() {
  if (cart.isEmpty) {
    alert('購物車是空的，先去逛逛吧！')
    return
  }
  router.push('/checkout')
}

function goToShop() {
  router.push('/products')
}

// 推薦商品左右滾動
function scrollLeft() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: -220, behavior: 'smooth' })
  }
}
function scrollRight() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: 220, behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="container py-5" style="max-width: 900px;">
    <!-- 頁面標題 -->
    <h2 class="section-title">
      <i class="bi bi-cart3" style="color: var(--brand-teal);"></i>
      我的購物車
    </h2>

    <!-- ====== 空購物車（豐富版）====== -->
    <div v-if="cart.isEmpty">
      <!-- 主視覺區 -->
      <div class="empty-hero card card-rounded shadow-sm border-0 mb-4">
        <div class="empty-hero-inner">
          <!-- 裝飾動畫羽球 -->
          <div class="shuttle-float">
            <i class="bi bi-circle" style="font-size: 3.5rem;"></i>
          </div>
          <div class="empty-hero-content text-center">
            <div class="empty-icon-wrap mb-3">
              <i class="bi bi-cart3"></i>
            </div>
            <h4 class="fw-bold mb-2" style="color: white;">購物車還是空的</h4>
            <p class="mb-4" style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">
              選一支好球拍，從今天開始你的羽球之旅！
            </p>
            <button class="btn btn-light fw-bold px-4 py-2" @click="goToShop"
                    style="border-radius: 1rem; color: var(--brand-teal);">
              <i class="bi bi-shop me-2"></i>前往商城選購
            </button>
          </div>
        </div>
      </div>

      <!-- 球館特色 -->
      <div class="row g-3 mb-4">
        <div class="col-4" v-for="(feat, i) in [
          { icon: 'bi-shop-window', title: '球館自取', desc: '打球順便領貨' },
          { icon: 'bi-shield-check', title: '品質保證', desc: '原廠正品授權' },
          { icon: 'bi-arrow-repeat', title: '七天鑑賞', desc: '不滿意可退換' },
        ]" :key="i">
          <div class="card card-rounded shadow-sm border-0 text-center p-3 h-100 hover-lift">
            <div class="feature-icon mx-auto mb-2">
              <i :class="['bi', feat.icon]"></i>
            </div>
            <div class="fw-bold" style="font-size: 0.85rem; color: var(--brand-dark);">{{ feat.title }}</div>
            <div class="text-secondary" style="font-size: 0.72rem;">{{ feat.desc }}</div>
          </div>
        </div>
      </div>

      <!-- 推薦商品（可左右滑動） -->
      <div v-if="recommendedProducts.length > 0" class="recommend-section">
        <h5 class="fw-bold mb-3" style="color: var(--brand-dark); font-size: 1.05rem;">
          <i class="bi bi-stars me-2" style="color: var(--brand-sky);"></i>為你推薦
        </h5>
        <div class="recommend-track-wrap">
          <button class="scroll-arrow scroll-arrow-left" @click="scrollLeft" aria-label="上一個">
            <i class="bi bi-chevron-left"></i>
          </button>
          <div class="recommend-track" ref="scrollContainer">
          <div v-for="product in recommendedProducts" :key="product.productId" class="recommend-slide">
            <div class="card card-rounded shadow-sm border-0 h-100 hover-lift recommend-card">
              <div class="recommend-img-wrap img-zoom">
                <img
                  v-if="product.imageUrl"
                  :src="product.imageUrl.startsWith('/') || product.imageUrl.startsWith('http') ? product.imageUrl : '/' + product.imageUrl"
                  class="recommend-img"
                  :alt="product.productName"
                />
                <div v-else class="recommend-img-placeholder">
                  <i class="bi bi-box-seam" style="font-size: 2rem; color: #CBD5E1;"></i>
                </div>
              </div>
              <div class="card-body p-3">
                <div class="fw-bold line-clamp-1 mb-1" style="font-size: 0.82rem; color: var(--brand-dark);">
                  {{ product.productName }}
                </div>
                <div class="text-secondary mb-2" style="font-size: 0.7rem;" v-if="product.brand">{{ product.brand }}</div>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold" style="color: var(--brand-teal); font-size: 0.9rem;">
                    NT$ {{ Number(product.price).toLocaleString() }}
                  </span>
                  <button class="btn btn-sm add-cart-btn" @click="addRecommendedToCart(product)" title="加入購物車">
                    <i class="bi bi-cart-plus"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
          <button class="scroll-arrow scroll-arrow-right" @click="scrollRight" aria-label="下一個">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- 載入中 -->
      <div v-else-if="loadingProducts" class="text-center py-4">
        <div class="spinner-border spinner-border-sm" style="color: var(--brand-sky);"></div>
        <span class="text-secondary ms-2" style="font-size: 0.85rem;">載入推薦商品中...</span>
      </div>
    </div>

    <!-- 有商品的購物車 -->
    <div v-else>
      <div class="card card-rounded shadow-sm border-0 mb-4">
        <div class="card-body p-0">
          <!-- 表頭 -->
          <div class="cart-header d-none d-md-flex">
            <div class="cart-col-product">商品</div>
            <div class="cart-col-price">單價</div>
            <div class="cart-col-qty">數量</div>
            <div class="cart-col-subtotal">小計</div>
            <div class="cart-col-action"></div>
          </div>

          <!-- 商品列表 -->
          <template v-for="item in cart.items" :key="item.productId">
            <div class="cart-item-block">
              <!-- 主商品列 -->
              <div class="cart-item">
                <div class="cart-col-product">
                  <div class="d-flex align-items-center gap-3">
                    <img
                      v-if="item.imageUrl"
                      :src="item.imageUrl.startsWith('/') || item.imageUrl.startsWith('http') ? item.imageUrl : '/' + item.imageUrl"
                      class="rounded-3 border"
                      style="width: 64px; height: 64px; object-fit: cover;"
                      :alt="item.productName"
                    />
                    <div v-else class="rounded-3 d-flex align-items-center justify-content-center"
                         style="width: 64px; height: 64px; background: #F1F5F9;">
                      <i class="bi bi-box-seam" style="font-size: 1.5rem; color: #CBD5E1;"></i>
                    </div>
                    <div>
                      <div class="fw-bold" style="color: var(--brand-dark);">{{ item.productName }}</div>
                      <div class="text-secondary" style="font-size: 0.75rem;" v-if="item.brand">{{ item.brand }}</div>
                    </div>
                  </div>
                </div>

                <div class="cart-col-price">
                  <span class="d-md-none text-secondary me-1" style="font-size: 0.75rem;">單價</span>
                  <span class="fw-semibold">NT$ {{ item.price.toLocaleString() }}</span>
                </div>

                <div class="cart-col-qty">
                  <div class="qty-control">
                    <button class="qty-btn" @click="cart.updateQuantity(item.productId, item.quantity - 1)"
                            :disabled="item.quantity <= 1">
                      <i class="bi bi-dash"></i>
                    </button>
                    <span class="qty-value">{{ item.quantity }}</span>
                    <button class="qty-btn" @click="cart.updateQuantity(item.productId, item.quantity + 1)"
                            :disabled="item.quantity >= item.stockQty">
                      <i class="bi bi-plus"></i>
                    </button>
                  </div>
                  <div class="text-secondary text-center mt-1" style="font-size: 0.7rem;">
                    庫存 {{ item.stockQty }} 件
                  </div>
                </div>

                <div class="cart-col-subtotal">
                  <span class="d-md-none text-secondary me-1" style="font-size: 0.75rem;">小計</span>
                  <span class="fw-bold" style="color: var(--brand-teal);">
                    NT$ {{ (item.price * item.quantity).toLocaleString() }}
                  </span>
                </div>

                <div class="cart-col-action">
                  <button class="btn btn-sm remove-btn" @click="cart.removeItem(item.productId)" title="移除">
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </div>

              <!-- 「相似好物」按鈕（框線內右下角） -->
              <div class="similar-trigger-row">
                <button class="similar-trigger-btn" @click="toggleSimilar(item)"
                        :class="{ active: expandedSimilar === item.productId }">
                  <i class="bi" :class="expandedSimilar === item.productId ? 'bi-x-lg' : 'bi-grid-3x3-gap'"></i>
                  {{ expandedSimilar === item.productId ? '收起' : '相似好物' }}
                </button>
              </div>

              <!-- 同類商品（表格行形式，在原商品下方做比較） -->
              <transition name="slide">
                <div v-if="expandedSimilar === item.productId" class="similar-rows">
                  <div v-if="similarMap[item.productId]?.length > 0">
                    <div v-for="sp in similarMap[item.productId]" :key="sp.productId"
                         class="cart-item similar-item">
                      <div class="cart-col-product">
                        <div class="d-flex align-items-center gap-3">
                          <img v-if="sp.imageUrl"
                               :src="sp.imageUrl.startsWith('/') || sp.imageUrl.startsWith('http') ? sp.imageUrl : '/' + sp.imageUrl"
                               class="rounded-3 border"
                               style="width: 52px; height: 52px; object-fit: cover;" :alt="sp.productName" />
                          <div v-else class="rounded-3 d-flex align-items-center justify-content-center"
                               style="width: 52px; height: 52px; background: #F0FDFA;">
                            <i class="bi bi-box-seam" style="font-size: 1.1rem; color: #94E5D4;"></i>
                          </div>
                          <div>
                            <div class="fw-semibold" style="color: var(--brand-dark); font-size: 0.88rem;">{{ sp.productName }}</div>
                            <div class="text-secondary" style="font-size: 0.72rem;" v-if="sp.brand">{{ sp.brand }}</div>
                          </div>
                        </div>
                      </div>
                      <div class="cart-col-price">
                        <span class="fw-semibold" style="font-size: 0.88rem;">NT$ {{ Number(sp.price).toLocaleString() }}</span>
                      </div>
                      <div class="cart-col-qty">
                        <span class="text-secondary" style="font-size: 0.75rem;">庫存 {{ sp.stockQty }} 件</span>
                      </div>
                      <div class="cart-col-subtotal"></div>
                      <div class="cart-col-action">
                        <button class="btn btn-sm similar-add-row-btn" @click="addRecommendedToCart(sp)" title="加入購物車">
                          <i class="bi bi-cart-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center text-secondary py-3" style="font-size: 0.85rem;">
                    <i class="bi bi-emoji-neutral me-1"></i>暫無同類商品
                  </div>
                </div>
              </transition>
            </div>
          </template>
        </div>
      </div>

      <!-- 底部結算區 -->
      <div class="card card-rounded shadow-sm border-0">
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div>
              <button class="btn btn-brand-outline" @click="goToShop">
                <i class="bi bi-arrow-left me-2"></i>繼續逛商城
              </button>
            </div>
            <div class="d-flex align-items-center gap-4">
              <div class="text-end">
                <div class="text-secondary" style="font-size: 0.8rem;">
                  共 {{ cart.cartCount }} 件商品
                </div>
                <div class="fw-bold" style="font-size: 1.5rem; color: var(--brand-teal);">
                  NT$ {{ cart.cartTotal.toLocaleString() }}
                </div>
              </div>
              <button class="btn btn-brand px-4 py-3" @click="goToCheckout"
                      style="font-size: 1.05rem;">
                <i class="bi bi-credit-card me-2"></i>前往結帳
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 表頭 ===== */
.cart-header {
  display: flex;
  align-items: center;
  padding: 0.85rem 1.5rem;
  background: #F8FAFC;
  border-bottom: 2px solid #F1F5F9;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--brand-card-radius) var(--brand-card-radius) 0 0;
}

/* ===== 商品列 ===== */
.cart-item {
  display: flex;
  align-items: center;
  padding: 1.25rem 1.5rem;
  transition: background 0.15s ease;
}
.cart-item:hover { background: #FAFBFC; }

/* ===== 欄位寬度 ===== */
.cart-col-product  { flex: 1; min-width: 0; }
.cart-col-price    { width: 120px; text-align: center; font-size: 0.9rem; }
.cart-col-qty      { width: 140px; text-align: center; }
.cart-col-subtotal { width: 130px; text-align: right; font-size: 0.95rem; }
.cart-col-action   { width: 50px; text-align: center; }

/* ===== 數量控制器 ===== */
.qty-control {
  display: inline-flex;
  align-items: center;
  border: 2px solid #E2E8F0;
  border-radius: 10px;
  overflow: hidden;
}
.qty-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: white;
  color: #64748B;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.qty-btn:hover:not(:disabled) {
  background: var(--brand-teal);
  color: white;
}
.qty-btn:disabled {
  color: #CBD5E1;
  cursor: not-allowed;
}
.qty-value {
  width: 40px;
  text-align: center;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--brand-dark);
  border-left: 2px solid #E2E8F0;
  border-right: 2px solid #E2E8F0;
  line-height: 34px;
}

/* ===== 移除按鈕 ===== */
.remove-btn {
  color: #94A3B8;
  border: none;
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  transition: all 0.2s ease;
}
.remove-btn:hover {
  background: #FEF2F2;
  color: #EF4444;
}

/* ===== 商品區塊（含相似好物） ===== */
.cart-item-block {
  border-bottom: 1px solid #F1F5F9;
}
.cart-item-block:last-child { border-bottom: none; }

/* ===== 「相似好物」觸發按鈕 ===== */
.similar-trigger-row {
  display: flex;
  justify-content: flex-end;
  padding: 0 1.5rem 0.65rem;
}
.similar-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 1rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--brand-teal);
  background: #F0FDFA;
  border: 1.5px solid #CCFBF1;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.similar-trigger-btn:hover {
  background: var(--brand-teal);
  color: white;
  border-color: var(--brand-teal);
}
.similar-trigger-btn.active {
  background: #F1F5F9;
  color: #64748B;
  border-color: #E2E8F0;
}

/* ===== 同類商品行 ===== */
.similar-rows {
  background: #FAFFFE;
  border-top: 1px dashed #CCFBF1;
}
.similar-item {
  background: #F0FDFA !important;
  padding: 0.85rem 1.5rem !important;
  border-bottom: 1px solid #E0F5F0 !important;
  font-size: 0.9rem;
}
.similar-item:last-child { border-bottom: none !important; }
.similar-item:hover { background: #E6FAF5 !important; }
.similar-add-row-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--brand-teal);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 1rem;
  transition: all 0.2s ease;
}
.similar-add-row-btn:hover {
  background: var(--brand-sky);
  transform: scale(1.1);
}

/* ===== 展開動畫 ===== */
.slide-enter-active { transition: all 0.3s ease; }
.slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; overflow: hidden; }
.slide-enter-to, .slide-leave-from { opacity: 1; max-height: 500px; }

/* ===== RWD ===== */
@media (max-width: 767.98px) {
  .cart-item {
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 1rem;
  }
  .cart-col-product { width: 100%; }
  .cart-col-price,
  .cart-col-subtotal { width: auto; text-align: left; }
  .cart-col-qty { width: auto; }
  .cart-col-action { width: auto; }
}

/* ===== 空購物車 Hero ===== */
.empty-hero-inner {
  position: relative;
  background: linear-gradient(135deg, var(--brand-teal-dark), var(--brand-sky-dark));
  border-radius: var(--brand-card-radius);
  padding: 3rem 2rem;
  overflow: hidden;
}
.empty-hero-content {
  position: relative;
  z-index: 2;
}
.empty-icon-wrap {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 2rem;
  color: white;
  backdrop-filter: blur(4px);
}
/* 裝飾浮動羽球 */
.shuttle-float {
  position: absolute;
  top: 15%;
  right: 8%;
  color: rgba(255,255,255,0.08);
  font-size: 6rem;
  animation: floatUpDown 4s ease-in-out infinite;
  z-index: 1;
}
@keyframes floatUpDown {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(8deg); }
}

/* ===== 球館特色 Icon ===== */
.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #F0FDFA, #F0F9FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--brand-teal);
}

/* ===== 推薦商品 ===== */
.recommend-section { position: relative; }
.recommend-track-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.recommend-track {
  flex: 1;
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 0.25rem 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.recommend-track::-webkit-scrollbar { display: none; }
.recommend-slide {
  flex: 0 0 200px;
  scroll-snap-align: start;
}
.recommend-card { overflow: hidden; }
.recommend-img-wrap {
  height: 140px;
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
}
.recommend-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.recommend-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F1F5F9;
}

/* ===== 左右箭頭（浮在兩側） ===== */
.scroll-arrow {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
  z-index: 5;
}
.scroll-arrow:hover {
  color: var(--brand-teal);
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: scale(1.1);
}

/* ===== 加入購物車按鈕 ===== */
.add-cart-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #F0FDFA;
  color: var(--brand-teal);
  border: 1px solid #CCFBF1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}
.add-cart-btn:hover {
  background: var(--brand-teal);
  color: white;
  border-color: var(--brand-teal);
  transform: scale(1.1);
}

/* ===== RWD 推薦商品 ===== */
@media (max-width: 767.98px) {
  .recommend-slide { flex: 0 0 160px; }
  .recommend-img-wrap { height: 110px; }
}
</style>

