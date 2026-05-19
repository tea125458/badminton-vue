<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
  RACKET: '球拍', SHUTTLECOCK: '羽球',
  SHOES: '球鞋', GRIP: '握把布',
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

// ===================== 行銷標籤篩選 =====================
const filterTag = ref('') // '' | '精選' | '促銷' | '熱銷'
const tagFilters = [
  { value: '精選', label: '天晴精選', cls: 'tag-btn--featured' },
  { value: '促銷', label: '特價商品', cls: 'tag-btn--sale' },
  { value: '熱銷', label: '熱銷商品', cls: 'tag-btn--hot' },
]
function toggleTag(t) {
  filterTag.value = filterTag.value === t ? '' : t
}

const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchCategory = !filterCategory.value || p.category === filterCategory.value
    const matchTag = !filterTag.value || p.marketingTag === filterTag.value
    return matchCategory && matchTag
  })
})

// ===================== 分頁（比照 ProductManage.vue） =====================
const currentPage = ref(1)
const pageSize = 20 // 每頁 20 筆

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / pageSize)))

// 換類別或行銷標籤時回到第 1 頁
watch([filterCategory, filterTag], () => { currentPage.value = 1 })

// 筆數變少導致目前頁碼超出總頁數時，夾回最後一頁，避免卡在空白頁
watch(totalPages, (tp) => {
  if (currentPage.value > tp) currentPage.value = tp
})

const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredProducts.value.slice(start, start + pageSize)
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

// ===================== 加入購物車確認 Modal =====================
const modal = ref({ show: false, product: null, qty: 1 })
const recPage = ref(0)

const modalSubtotal = computed(() =>
  modal.value.product ? Number(modal.value.product.price) * modal.value.qty : 0
)

const modalStock = computed(() => {
  const s = modal.value.product?.stockQty
  return s == null || s === '' ? Infinity : Number(s)
})
const modalAtMax = computed(() => modal.value.qty >= modalStock.value)

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

function modalIncreaseQty() {
  if (modal.value.qty < modalStock.value) modal.value.qty++
}

function addToCart() {
  cart.add(modal.value.product, modal.value.qty)
  closeModal()
  cart.openDrawer()
}

function goToCheckout() {
  router.push('/cart')
}

// ===================== 商品詳情 Modal =====================
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

function closeDetailModal() {
  detailModal.value.show = false
}

function openCartFromDetail() {
  const p = detailModal.value.product
  closeDetailModal()
  openModal(p)
}

// 商品詳情圖片放大鏡：滑鼠移到圖上，放大中心跟著游標
const imgZoom = ref({ active: false, x: '50%', y: '50%' })

function onImgZoomMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  imgZoom.value = { active: true, x: `${x}%`, y: `${y}%` }
}

function onImgZoomLeave() {
  // 保留游標最後位置，只關掉放大，讓圖片原地平滑縮回（不跳回中心）
  imgZoom.value = { ...imgZoom.value, active: false }
}
</script>

<template>
  <div class="browse-page">


    <!-- ====== Hero ====== -->
    <div class="browse-hero">
      <img src="/images/product/product_banner.png" alt="天晴商城 精選羽球商品" class="browse-hero-img" />
    </div>

    <!-- ====== 商品 Grid ====== -->
    <div class="browse-container">
      <h2 class="section-title">{{ filterCategory ? (categoryMap[filterCategory] || filterCategory) : '所有商品' }}</h2>

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

        <!-- 行銷標籤篩選（同一排） -->
        <button
          v-for="t in tagFilters"
          :key="t.value"
          class="cat-btn tag-btn"
          :class="[t.cls, { active: filterTag === t.value }]"
          @click="toggleTag(t.value)"
        >{{ t.label }}</button>
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
          v-for="product in pagedProducts"
          :key="product.productId"
          class="col-6 col-md-4 col-lg-3"
        >
          <div class="product-card card-rounded hover-lift product-card--clickable" @click="openDetailModal(product)">
            <!-- 商品圖片 -->
            <div class="img-zoom product-img-wrap">
              <img
                :src="product.imageUrl || defaultImage"
                :alt="product.productName"
                class="product-img"
                :class="{ 'product-img--sold-out': product.stockQty === 0 }"
                @error="onImageError"
              />
              <div v-if="product.stockQty === 0" class="img-sold-out-overlay"></div>

              <!-- 左上角類別標籤 -->
              <span class="badge-teal img-category-badge">{{ categoryMap[product.category] || product.category }}</span>

              <!-- 右上角庫存 badge -->
              <span v-if="product.stockQty === 0" class="stock-badge stock-badge--empty">缺貨中</span>
              <span v-else-if="product.stockQty <= 10" class="stock-badge stock-badge--low">少量庫存</span>

              <!-- 圖片底部橫幅（半透明疊層） -->
              <div v-if="product.stockQty === 0" class="img-stock-banner img-stock-banner--empty">
                <i class="bi bi-clock-history me-1"></i>熱銷完售，補貨中
              </div>
              <div v-else-if="product.marketingTag === '熱銷'" class="img-stock-banner img-stock-banner--low">
                <i class="bi bi-fire me-1"></i>熱銷中
              </div>
              <div v-else-if="product.marketingTag === '精選'" class="img-stock-banner img-stock-banner--featured">
                <i class="bi bi-star-fill me-1"></i>精選推薦
              </div>
              <div v-else-if="product.marketingTag === '促銷'" class="img-stock-banner img-stock-banner--sale">
                <i class="bi bi-tag-fill me-1"></i>限時特惠
              </div>
            </div>

            <!-- 商品資訊 -->
            <div class="product-body">
              <p class="product-brand">{{ product.brand }}</p>
              <h6 class="product-name line-clamp-2">{{ product.productName }}</h6>
              <div class="product-footer">
                <span class="product-price">${{ Number(product.price).toLocaleString() }}</span>
                <button
                  class="add-btn-sm"
                  @click.stop="openModal(product)"
                  :disabled="product.stockQty === 0"
                >
                  <i class="bi bi-cart-plus me-1"></i>加入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== 分頁（比照 ProductManage.vue） ====== -->
      <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
        <ul class="pagination pagination-custom">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="goToPage(currentPage - 1)">
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>
          <li
            v-for="page in totalPages"
            :key="page"
            class="page-item"
            :class="{ active: currentPage === page }"
          >
            <button class="page-link" @click="goToPage(page)">{{ page }}</button>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="goToPage(currentPage + 1)">
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- 購物車已移至全域 CartOffcanvas 元件（由 FrontNavbar 管理） -->

    <!-- ====== 商品詳情 Modal ====== -->
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
            <div
              class="detail-modal-img-wrap"
              @mousemove="onImgZoomMove"
              @mouseleave="onImgZoomLeave"
            >
              <img
                :src="detailModal.product?.imageUrl || defaultImage"
                :alt="detailModal.product?.productName"
                class="detail-modal-img"
                :class="{ 'is-zoomed': imgZoom.active }"
                :style="{ transformOrigin: `${imgZoom.x} ${imgZoom.y}` }"
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
                <!-- <span v-if="detailModal.product?.stockQty === 0" class="stock-badge stock-badge--empty detail-row-stock">缺貨中</span> -->
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
              <div v-if="modal.product?.spec" class="modal-spec">
                <span class="modal-spec-label">規格</span>
                <span class="modal-spec-text">{{ modal.product?.spec }}</span>
              </div>
            </div>
            <div class="cart-modal-qty-wrap">
              <span class="cart-modal-qty-label">數量</span>
              <div class="qty-control">
                <button class="qty-btn" @click="modalDecreaseQty"><i class="bi bi-dash"></i></button>
                <span class="qty-num">{{ modal.qty }}</span>
                <button class="qty-btn" :disabled="modalAtMax" @click="modalIncreaseQty"><i class="bi bi-plus"></i></button>
              </div>
              <span v-if="modalAtMax && modalStock !== Infinity" class="cart-modal-qty-max">已達庫存上限</span>
            </div>
            <p class="cart-modal-subtotal">NT${{ modalSubtotal.toLocaleString() }}</p>
          </div>

          <!-- 操作按鈕 -->
          <div class="cart-modal-actions">
            <button class="cart-modal-continue" @click="closeModal">繼續購物</button>
            <button class="btn-brand cart-modal-go" @click="addToCart">加入購物車</button>
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
  width: 100%;
  overflow: hidden;
  line-height: 0;
}
.browse-hero-img {
  width: 100%;
  aspect-ratio: 3 / 1;
  object-fit: cover;
  display: block;
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

/* 天晴精選 */
.tag-btn--featured:hover {
  border-color: #0EA5E9;
  color: #0EA5E9;
}
.tag-btn--featured.active {
  background: #0EA5E9;
  border-color: #0EA5E9;
  color: white;
}
/* 特價商品 */
.tag-btn--sale:hover {
  border-color: #DC2626;
  color: #DC2626;
}
.tag-btn--sale.active {
  background: #DC2626;
  border-color: #DC2626;
  color: white;
}
/* 熱銷商品 */
.tag-btn--hot:hover {
  border-color: #D97706;
  color: #D97706;
}
.tag-btn--hot.active {
  background: #F59E0B;
  border-color: #F59E0B;
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
  font-size: 0.88rem;
  font-weight: 500;
  padding: 0.35rem 0.65rem;
  border-radius: 9999px;
  z-index: 1;
  letter-spacing: 0.05em;
  line-height: 1.2;
}
.stock-badge--empty {
  background: rgba(254, 226, 226, 0.92);
  color: #DC3545;
}
.stock-badge--low {
  background: rgba(254, 243, 199, 0.95);
  color: #D97706;
}

/* 左上角類別標籤（圖片疊層） */
.img-category-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 1;
  font-size: 0.88rem;
  border-radius: 9999px;
  padding: 0.35rem 0.65rem;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

/* 圖片底部橫幅（半透明疊層） */
.img-stock-banner {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 0.88rem;
  font-weight: 700;
  text-align: center;
  padding: 0.35rem 1rem;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1;
}
.img-sold-out-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.15);
  z-index: 0;
}
.product-img--sold-out {
  filter: grayscale(10%);
}
.img-stock-banner--empty {
  background: linear-gradient(90deg, #D4845A, #C46262);
  color: white;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  z-index: 2;
}
.img-stock-banner--low {
  background: linear-gradient(90deg, rgba(254, 243, 199, 0.9), rgba(252, 211, 77, 0.9));
  color: #B45309;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.img-stock-banner--featured {
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.72), rgba(13, 148, 136, 0.72));
  color: white;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
.img-stock-banner--sale {
  background: linear-gradient(90deg, rgba(244, 63, 94, 0.8), rgba(220, 38, 38, 0.8));
  color: white;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
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
  font-size: 0.8rem;
  color: #94A3B8;
  font-weight: 600;
  margin: 0.3rem 0 0.25rem;
}
.product-name {
  font-size: 1rem;
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
.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.qty-btn:disabled:hover {
  background: white;
  border-color: #E2E8F0;
  color: #475569;
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

/* ===== 商品卡片可點擊樣式 ===== */
.product-card--clickable {
  cursor: pointer;
}

.detail-category-badge {
  font-size: 1.0rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  line-height: 1.2;
}
.detail-category-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
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

/* ===== 自訂分頁（比照 ProductManage.vue） ===== */
.pagination-custom .page-link {
  border: none;
  color: #64748B;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.5rem 0.85rem;
  border-radius: 0.5rem;
  margin: 0 2px;
  transition: all 0.2s ease;
}
.pagination-custom .page-link:hover {
  background: #F0F9FF;
  color: var(--brand-sky);
}
.pagination-custom .active .page-link {
  background: var(--brand-sky);
  color: white;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
}
.pagination-custom .disabled .page-link {
  color: #CBD5E1;
}

/* ===== 商品詳情 Modal ===== */
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
  cursor: zoom-in;
}
.detail-modal-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.75rem;
  transition: transform 0.45s ease-out; /* 縮回來：放慢 */
}
.detail-modal-img.is-zoomed {
  transform: scale(2.2);
  transition: transform 0.15s ease-out; /* 放大進去：保持靈敏跟手 */
}
.detail-row-stock {
  position: static;
  margin-left: auto;
  font-size: 1.0rem;
  font-weight: 500;
  padding: 0.35rem 0.75rem;
  border: 1px solid transparent;
  letter-spacing: 0.05em;
}
.detail-modal-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
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

/* ===== 規格（純文字顯示） ===== */
.modal-spec {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.modal-spec-label {
  font-size: 0.72rem;
  color: #94A3B8;
  font-weight: 600;
  white-space: nowrap;
}
.modal-spec-text {
  font-size: 0.82rem;
  color: #475569;
  white-space: pre-line;
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
.cart-modal-qty-max {
  font-size: 0.68rem;
  color: #EF4444;
  font-weight: 600;
  margin-top: 0.2rem;
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
  align-items: stretch;
}
.rec-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}
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
  min-height: calc(0.8rem * 1.35 * 2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rec-desc {
  font-size: 0.72rem;
  color: #94A3B8;
  margin-bottom: 0.5rem;
  min-height: calc(0.72rem * 1.5);
}
.rec-cart-btn {
  width: 100%;
  margin-top: auto;
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
