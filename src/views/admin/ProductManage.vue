<script setup>
/**
 * 商品管理 — 列表式 CRUD + 圖片上傳 + 分頁 + 搜尋篩選
 */
import { ref, computed, onMounted } from 'vue'
import { productApi } from '@/api/product'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

// ===================== 資料狀態 =====================
const products = ref([])
const loading = ref(true)
const keyword = ref('')
const filterCategory = ref('')
const filterStatus = ref('')

// ===================== 分頁 =====================
const currentPage = ref(1)
const pageSize = 10 // 每頁 10 筆

// ===================== Modal 狀態 =====================
const showModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const imageFile = ref(null)
const imagePreview = ref('')
const formData = ref(createEmptyForm())

// ===================== 刪除確認 =====================
const showConfirm = ref(false)
const deleteTarget = ref(null)

// ===================== 常數 =====================
const categoryMap = {
  RACKET: '球拍', SHUTTLECOCK: '羽球', GRIP: '握把布',
  STRING: '球線', ACCESSORY: '配件', OTHER: '其他',
}
const categoryOptions = Object.entries(categoryMap)

const statusMap = {
  ACTIVE: { label: '上架中', color: '#10B981', bg: '#ECFDF5' },
  INACTIVE: { label: '已下架', color: '#EF4444', bg: '#FEF2F2' },
  PREPARING: { label: '備貨中', color: '#F59E0B', bg: '#FFFBEB' },
}

// ===================== 計算屬性 =====================
const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchKeyword =
      !keyword.value ||
      p.productName?.toLowerCase().includes(keyword.value.toLowerCase()) ||
      p.brand?.toLowerCase().includes(keyword.value.toLowerCase())
    const matchCategory = !filterCategory.value || p.category === filterCategory.value
    const matchStatus = !filterStatus.value || p.status === filterStatus.value
    return matchKeyword && matchCategory && matchStatus
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / pageSize)))

const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredProducts.value.slice(start, start + pageSize)
})

const totalCount = computed(() => products.value.length)
const filteredCount = computed(() => filteredProducts.value.length)

// ===================== 方法 =====================
function createEmptyForm() {
  return {
    productId: null, productName: '', category: 'RACKET',
    brand: '', price: '', stockQty: '', description: '',
    imageUrl: '', status: 'ACTIVE',
  }
}

async function loadProducts() {
  loading.value = true
  try {
    products.value = await productApi.findAll()
  } catch (e) {
    console.error('載入商品失敗', e)
    alert('載入商品失敗，請確認後端是否已啟動')
  } finally {
    loading.value = false
  }
}

// 打開新增 Modal
function openCreate() {
  isEditing.value = false
  formData.value = createEmptyForm()
  imageFile.value = null
  imagePreview.value = ''
  showModal.value = true
}

// 打開編輯 Modal
function openEdit(product) {
  isEditing.value = true
  formData.value = { ...product }
  imageFile.value = null
  imagePreview.value = product.imageUrl || ''
  showModal.value = true
}

// 圖片選取
function onImageChange(e) {
  const file = e.target.files[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

// 儲存（新增 / 更新）
async function handleSave() {
  if (!formData.value.productName || !formData.value.price) {
    alert('請填寫商品名稱和價格')
    return
  }
  saving.value = true
  try {
    // 如果有選擇新圖片，先上傳
    if (imageFile.value) {
      const res = await productApi.uploadImage(imageFile.value)
      formData.value.imageUrl = res.imageUrl
    }
    if (isEditing.value) {
      await productApi.update(formData.value.productId, formData.value)
    } else {
      await productApi.create(formData.value)
    }
    showModal.value = false
    await loadProducts()
  } catch (e) {
    console.error('儲存失敗', e)
    alert('儲存失敗：' + (e.response?.data?.error || e.message))
  } finally {
    saving.value = false
  }
}

// 刪除
function confirmDelete(product) {
  deleteTarget.value = product
  showConfirm.value = true
}

async function handleDelete() {
  try {
    await productApi.delete(deleteTarget.value.productId)
    showConfirm.value = false
    deleteTarget.value = null
    await loadProducts()
  } catch (e) {
    console.error('刪除失敗', e)
    alert('刪除失敗')
  }
}

// 下拉選單切換狀態
async function changeStatus(product, newStatus) {
  if (newStatus === product.status) return
  try {
    await productApi.updateStatus(product.productId, newStatus)
    await loadProducts()
  } catch (e) {
    console.error('狀態更新失敗', e)
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

// 篩選條件改變時重置到第一頁
function onFilterChange() {
  currentPage.value = 1
}

function formatPrice(val) {
  return val != null ? `NT$ ${Number(val).toLocaleString()}` : 'NT$ 0'
}

onMounted(loadProducts)
</script>

<template>
  <div class="product-manage">
    <!-- ====== 頁面標題 ====== -->
    <div class="mb-4">
      <h2 class="fw-bold mb-1" style="font-size: 1.5rem">
        <i class="bi bi-box-seam me-2" style="color: var(--brand-sky)"></i>商品管理
      </h2>
      <p class="text-secondary mb-0" style="font-size: 0.85rem">
        管理所有羽球商品，共 {{ totalCount }} 件商品
        <span v-if="filteredCount !== totalCount">，篩選結果 {{ filteredCount }} 件</span>
      </p>
    </div>

    <!-- ====== 工具列 ====== -->
    <div class="card card-rounded shadow-sm border-0 mb-4">
      <div class="card-body p-3">
        <div class="row g-3 align-items-end">
          <!-- 搜尋 -->
          <div class="col-md-4">
            <label class="form-label small fw-semibold text-secondary">搜尋商品</label>
            <div class="input-group">
              <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-secondary"></i></span>
              <input
                v-model="keyword"
                type="text"
                class="form-control border-start-0"
                placeholder="輸入名稱或品牌..."
                @input="onFilterChange"
              />
            </div>
          </div>
          <!-- 分類篩選 -->
          <div class="col-md-2">
            <label class="form-label small fw-semibold text-secondary">分類</label>
            <select v-model="filterCategory" class="form-select" @change="onFilterChange">
              <option value="">全部分類</option>
              <option v-for="[val, label] in categoryOptions" :key="val" :value="val">{{ label }}</option>
            </select>
          </div>
          <!-- 狀態篩選 -->
          <div class="col-md-2">
            <label class="form-label small fw-semibold text-secondary">狀態</label>
            <select v-model="filterStatus" class="form-select" @change="onFilterChange">
              <option value="">全部狀態</option>
              <option value="ACTIVE">上架中</option>
              <option value="INACTIVE">已下架</option>
              <option value="PREPARING">備貨中</option>
            </select>
          </div>
          <!-- 新增按鈕 -->
          <div class="col-md-4 text-end">
            <button class="btn btn-brand" @click="openCreate">
              <i class="bi bi-plus-lg me-1"></i>新增商品
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== Loading ====== -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--brand-sky)" role="status"></div>
      <p class="text-secondary mt-2">載入商品中...</p>
    </div>

    <!-- ====== 空狀態 ====== -->
    <div v-else-if="filteredProducts.length === 0" class="text-center py-5">
      <i class="bi bi-inbox" style="font-size: 3rem; color: #CBD5E1"></i>
      <p class="text-secondary mt-2">
        {{ products.length === 0 ? '尚未新增任何商品' : '沒有符合條件的商品' }}
      </p>
    </div>

    <!-- ====== 商品列表（表格式）====== -->
    <div v-else class="card card-rounded shadow-sm border-0 overflow-hidden">
      <table class="table table-hover align-middle mb-0 product-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>商品圖片</th>
            <th>商品名稱</th>
            <th>分類</th>
            <th>品牌</th>
            <th>價格</th>
            <th>庫存</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in pagedProducts" :key="product.productId">
            <td class="text-secondary fw-semibold">{{ product.productId }}</td>
            <td>
              <img
                v-if="product.imageUrl"
                :src="product.imageUrl.startsWith('/') || product.imageUrl.startsWith('http') ? product.imageUrl : '/' + product.imageUrl"
                :alt="product.productName"
                class="product-list-img"
              />
              <div v-else class="product-list-img-placeholder">
                <i class="bi bi-image" style="color: #CBD5E1"></i>
              </div>
            </td>
            <td class="fw-bold">{{ product.productName }}</td>
            <td class="text-secondary">{{ categoryMap[product.category] || product.category }}</td>
            <td class="text-secondary">{{ product.brand || '—' }}</td>
            <td class="fw-semibold" style="color: var(--brand-teal)">${{ Number(product.price).toLocaleString() }}</td>
            <td :class="product.stockQty <= 5 ? 'text-danger fw-semibold' : 'text-secondary'">
              {{ product.stockQty ?? 0 }}
            </td>
            <td>
              <span
                class="list-status-badge"
                :style="{ backgroundColor: statusMap[product.status]?.bg, color: statusMap[product.status]?.color }"
              >
                {{ statusMap[product.status]?.label || product.status }}
              </span>
            </td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-primary" title="編輯" @click="openEdit(product)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="刪除" @click="confirmDelete(product)">
                  <i class="bi bi-trash3"></i>
                </button>
                <div class="dropdown">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    data-bs-toggle="dropdown"
                    title="切換狀態"
                  >
                    <i class="bi bi-arrow-repeat"></i>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                      <button class="dropdown-item" :class="{ active: product.status === 'ACTIVE' }" @click="changeStatus(product, 'ACTIVE')">
                        上架中
                      </button>
                    </li>
                    <li>
                      <button class="dropdown-item" :class="{ active: product.status === 'INACTIVE' }" @click="changeStatus(product, 'INACTIVE')">
                        已下架
                      </button>
                    </li>
                    <li>
                      <button class="dropdown-item" :class="{ active: product.status === 'PREPARING' }" @click="changeStatus(product, 'PREPARING')">
                        備貨中
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ====== 分頁 ====== -->
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

    <!-- ====== 新增/編輯 Modal ====== -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-container">
        <div class="modal-header-custom">
          <h5 class="fw-bold mb-0">
            <i :class="isEditing ? 'bi bi-pencil-square' : 'bi bi-plus-circle'" class="me-2" style="color: var(--brand-sky)"></i>
            {{ isEditing ? '編輯商品' : '新增商品' }}
          </h5>
          <button class="btn-close" @click="showModal = false"></button>
        </div>

        <div class="modal-body-custom">
          <div class="row g-3">
            <!-- 商品名稱 -->
            <div class="col-md-8">
              <label class="form-label small fw-semibold">商品名稱 <span class="text-danger">*</span></label>
              <input v-model="formData.productName" type="text" class="form-control" placeholder="例：YONEX ASTROX 88D PRO" />
            </div>
            <!-- 品牌 -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">品牌</label>
              <input v-model="formData.brand" type="text" class="form-control" placeholder="例：YONEX" />
            </div>
            <!-- 分類 -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">分類</label>
              <select v-model="formData.category" class="form-select">
                <option v-for="[val, label] in categoryOptions" :key="val" :value="val">{{ label }}</option>
              </select>
            </div>
            <!-- 價格 -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">價格 <span class="text-danger">*</span></label>
              <div class="input-group">
                <span class="input-group-text">NT$</span>
                <input v-model="formData.price" type="number" class="form-control" placeholder="0" min="0" />
              </div>
            </div>
            <!-- 庫存 -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">庫存數量</label>
              <input v-model="formData.stockQty" type="number" class="form-control" placeholder="0" min="0" />
            </div>
            <!-- 狀態 -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">狀態</label>
              <select v-model="formData.status" class="form-select">
                <option value="ACTIVE">上架中</option>
                <option value="INACTIVE">已下架</option>
                <option value="PREPARING">備貨中</option>
              </select>
            </div>
            <!-- 說明 -->
            <div class="col-md-8">
              <label class="form-label small fw-semibold">商品描述</label>
              <textarea v-model="formData.description" class="form-control" rows="3" placeholder="商品說明..."></textarea>
            </div>
            <!-- 圖片上傳 -->
            <div class="col-12">
              <label class="form-label small fw-semibold">商品圖片</label>
              <div class="upload-area" @click="$refs.fileInput.click()">
                <img v-if="imagePreview" :src="imagePreview" class="upload-preview" />
                <div v-else class="upload-placeholder">
                  <i class="bi bi-cloud-arrow-up" style="font-size: 2rem; color: var(--brand-sky)"></i>
                  <p class="text-secondary mt-1 mb-0" style="font-size: 0.85rem">點擊上傳商品圖片</p>
                </div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" class="d-none" @change="onImageChange" />
            </div>
          </div>
        </div>

        <div class="modal-footer-custom">
          <button class="btn btn-outline-secondary" @click="showModal = false">取消</button>
          <button class="btn btn-brand" :disabled="saving" @click="handleSave">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            {{ saving ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== 刪除確認 ====== -->
    <ConfirmDialog
      :visible="showConfirm"
      title="確認刪除"
      :message="`確定要刪除「${deleteTarget?.productName}」嗎？此操作無法復原。`"
      @confirm="handleDelete"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<style scoped>
/* ===== 列表表格 ===== */
.product-table thead tr {
  background: #1E293B;
  color: white;
}
.product-table thead th {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.85rem 1rem;
  border: none;
  white-space: nowrap;
}
.product-table tbody td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #F1F5F9;
  font-size: 0.875rem;
}
.product-table tbody tr:last-child td {
  border-bottom: none;
}
.product-table tbody tr:hover td {
  background: #F8FAFC;
}

/* ===== 列表縮圖 ===== */
.product-list-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 0.5rem;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  padding: 4px;
}
.product-list-img-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 0.5rem;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

/* ===== 狀態標籤 ===== */
.list-status-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  white-space: nowrap;
}

/* ===== 自訂分頁 ===== */
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

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  animation: fadeIn 0.2s ease;
}
.modal-container {
  background: white;
  border-radius: 1.25rem;
  width: 95%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}
.modal-header-custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #F1F5F9;
}
.modal-body-custom {
  padding: 1.5rem;
}
.modal-footer-custom {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #F1F5F9;
}

/* ===== 圖片上傳區 ===== */
.upload-area {
  border: 2px dashed #E2E8F0;
  border-radius: 1rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-area:hover {
  border-color: var(--brand-sky);
  background: #F0F9FF;
}
.upload-preview {
  max-height: 160px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 0.5rem;
}

/* ===== 動畫 ===== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
