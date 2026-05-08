<script setup>
/**
 * 訂單管理 — 表格 + 展開明細 + 狀態篩選 + 快速狀態變更 + 分頁
 *
 * 後端資料結構：
 * Order  { orderId, member{fullName,email,phone}, orderDate, totalAmount, status, paymentType, note, createdAt }
 * OrderItem { itemId, orderId, product{productName,imageUrl}, quantity, unitPrice, subtotal }
 * OrderStatus: UNPAID | PAID | SHIPPED | COMPLETED | CANCELLED
 * PaymentType: CASH | CREDIT_CARD | TRANSFER | LINE_PAY
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi } from '@/api/order'
import { memberApi } from '@/api/member'
import { productApi } from '@/api/product'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

// ===================== 資料狀態 =====================
const orders = ref([])
const loading = ref(true)
const keyword = ref('')
const filterStatus = ref('')

// ===================== 分頁 =====================
const currentPage = ref(1)
const pageSize = 10

// ===================== 展開明細 =====================
const expandedOrderId = ref(null)
const orderItems = ref([])
const loadingItems = ref(false)

// ===================== 狀態下拉選單 =====================
const statusDropdownId = ref(null)

function toggleStatusDropdown(orderId) {
  statusDropdownId.value = statusDropdownId.value === orderId ? null : orderId
}

function closeStatusDropdown() {
  statusDropdownId.value = null
}

// ===================== 刪除 =====================
const showConfirm = ref(false)
const deleteTarget = ref(null)

// ===================== 編輯 Modal =====================
const showModal = ref(false)
const saving = ref(false)
const editForm = ref({})

// ===================== 新增訂單 Modal =====================
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = ref({ paymentType: '', note: '' })

// 會員搜尋
const memberKeyword = ref('')
const memberResults = ref([])
const selectedMember = ref(null)
const searchingMember = ref(false)
const showMemberDropdown = ref(false)
let memberDebounceTimer = null

// 商品選擇
const products = ref([])
const selectedProductId = ref('')
const selectQty = ref(1)

// 購物車
const cart = ref([])

const cartTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

// 會員搜尋（防抖 300ms）
function onMemberInput() {
  clearTimeout(memberDebounceTimer)
  if (memberKeyword.value.trim().length < 1) {
    memberResults.value = []
    showMemberDropdown.value = false
    return
  }
  memberDebounceTimer = setTimeout(async () => {
    searchingMember.value = true
    try {
      memberResults.value = await memberApi.search(memberKeyword.value.trim())
      showMemberDropdown.value = true
    } catch (e) {
      console.error('會員搜尋失敗', e)
      memberResults.value = []
    } finally {
      searchingMember.value = false
    }
  }, 300)
}

function pickMember(member) {
  selectedMember.value = member
  memberKeyword.value = member.fullName || member.username
  showMemberDropdown.value = false
}

function clearMember() {
  selectedMember.value = null
  memberKeyword.value = ''
  memberResults.value = []
}

// 載入可選商品（ACTIVE + 有庫存）
async function loadProducts() {
  try {
    const all = await productApi.findAll()
    products.value = all.filter(p => p.status === 'ACTIVE' && p.stockQty > 0)
  } catch (e) {
    console.error('載入商品失敗', e)
  }
}

// 加入購物車
function addToCart() {
  const pid = parseInt(selectedProductId.value)
  if (!pid) { alert('請選擇商品！'); return }
  const qty = parseInt(selectQty.value) || 1
  const product = products.value.find(p => p.productId === pid)
  if (!product) return

  const existing = cart.value.find(c => c.productId === pid)
  if (existing) {
    existing.quantity += qty
  } else {
    cart.value.push({
      productId: pid,
      name: product.productName,
      brand: product.brand || '',
      imageUrl: product.imageUrl,
      price: Math.round(product.price),
      stock: product.stockQty,
      quantity: qty,
    })
  }
  selectedProductId.value = ''
  selectQty.value = 1
}

function removeFromCart(index) {
  cart.value.splice(index, 1)
}

function updateCartQty(index, delta) {
  const item = cart.value[index]
  const newQty = item.quantity + delta
  if (newQty < 1) return
  if (newQty > item.stock) { alert(`庫存不足！剩餘 ${item.stock} 件`); return }
  item.quantity = newQty
}

// 打開新增訂單 Modal
function openCreateOrder() {
  createForm.value = { paymentType: '', note: '' }
  selectedMember.value = null
  memberKeyword.value = ''
  memberResults.value = []
  cart.value = []
  selectedProductId.value = ''
  selectQty.value = 1
  loadProducts()
  showCreateModal.value = true
}

// 送出新增訂單
async function handleCreateOrder() {
  if (!selectedMember.value) { alert('請選擇會員！'); return }
  if (cart.value.length === 0) { alert('請至少加入一項商品！'); return }

  creating.value = true
  try {
    // Step 1: 建立訂單
    const newOrder = await orderApi.create({
      member: { memberId: selectedMember.value.memberId },
      totalAmount: cartTotal.value,
      paymentType: createForm.value.paymentType || null,
      note: createForm.value.note || null,
    })

    // Step 2: 逐筆新增明細（後端自動扣庫存）
    for (const item of cart.value) {
      await orderApi.createItem(newOrder.orderId, {
        product: { productId: item.productId },
        quantity: item.quantity,
        unitPrice: item.price,
      })
    }

    showCreateModal.value = false
    await loadOrders()
    alert('訂單建立成功！')
  } catch (e) {
    console.error('建立訂單失敗', e)
    alert('建立訂單失敗：' + (e.response?.data?.message || e.message))
  } finally {
    creating.value = false
  }
}

// ===================== 常數 =====================
const statusMap = {
  UNPAID:    { label: '未付款', color: '#F59E0B', bg: '#FFFBEB', icon: 'bi-clock' },
  PAID:      { label: '已付款', color: '#10B981', bg: '#ECFDF5', icon: 'bi-check-circle' },
  SHIPPED:   { label: '已出貨', color: '#3B82F6', bg: '#EFF6FF', icon: 'bi-truck' },
  COMPLETED: { label: '已完成', color: '#6366F1', bg: '#EEF2FF', icon: 'bi-trophy' },
  CANCELLED: { label: '已取消', color: '#EF4444', bg: '#FEF2F2', icon: 'bi-x-circle' },
}
const statusOptions = Object.entries(statusMap)

const paymentMap = {
  CASH: '現金', CREDIT_CARD: '信用卡', TRANSFER: '轉帳', LINE_PAY: 'LINE Pay',
}

// 狀態流程：定義每個狀態「可以」轉到哪些狀態
const statusFlow = {
  UNPAID:    ['PAID', 'CANCELLED'],
  PAID:      ['SHIPPED', 'CANCELLED'],
  SHIPPED:   ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

// ===================== 狀態分頁 Tabs =====================
const statusTabs = [
  { key: '', label: '全部' },
  { key: 'UNPAID', label: '未付款' },
  { key: 'PAID', label: '已付款' },
  { key: 'SHIPPED', label: '已出貨' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' },
]

// ===================== 計算屬性 =====================
const filteredOrders = computed(() => {
  return orders.value.filter((o) => {
    const matchKeyword =
      !keyword.value ||
      String(o.orderId).includes(keyword.value) ||
      o.member?.fullName?.toLowerCase().includes(keyword.value.toLowerCase()) ||
      o.member?.phone?.includes(keyword.value)
    const matchStatus = !filterStatus.value || o.status === filterStatus.value
    return matchKeyword && matchStatus
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / pageSize)))

const pagedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredOrders.value.slice(start, start + pageSize)
})

// 各狀態計數（用於 Tab 上的 badge）
const statusCounts = computed(() => {
  const counts = { '': orders.value.length }
  for (const key of Object.keys(statusMap)) {
    counts[key] = orders.value.filter((o) => o.status === key).length
  }
  return counts
})

// ===================== 方法 =====================
async function loadOrders() {
  loading.value = true
  try {
    orders.value = await orderApi.findAll()
  } catch (e) {
    console.error('載入訂單失敗', e)
    alert('載入訂單失敗，請確認後端是否已啟動')
  } finally {
    loading.value = false
  }
}

// 展開 / 收合明細
async function toggleExpand(order) {
  if (expandedOrderId.value === order.orderId) {
    expandedOrderId.value = null
    orderItems.value = []
    return
  }
  expandedOrderId.value = order.orderId
  loadingItems.value = true
  try {
    orderItems.value = await orderApi.findItems(order.orderId)
  } catch (e) {
    console.error('載入明細失敗', e)
    orderItems.value = []
  } finally {
    loadingItems.value = false
  }
}

// 快速變更訂單狀態
async function changeStatus(order, newStatus) {
  try {
    await orderApi.updateStatus(order.orderId, newStatus)
    await loadOrders()
  } catch (e) {
    console.error('狀態更新失敗', e)
    alert('狀態更新失敗')
  }
}

// 打開編輯 Modal
function openEdit(order) {
  editForm.value = {
    orderId: order.orderId,
    status: order.status,
    paymentType: order.paymentType || '',
    note: order.note || '',
  }
  showModal.value = true
}

// 儲存編輯
async function handleSave() {
  saving.value = true
  try {
    await orderApi.update(editForm.value.orderId, editForm.value)
    showModal.value = false
    await loadOrders()
  } catch (e) {
    console.error('更新失敗', e)
    alert('更新失敗')
  } finally {
    saving.value = false
  }
}

// 刪除
function confirmDelete(order) {
  deleteTarget.value = order
  showConfirm.value = true
}

async function handleDelete() {
  try {
    await orderApi.delete(deleteTarget.value.orderId)
    showConfirm.value = false
    deleteTarget.value = null
    await loadOrders()
  } catch (e) {
    console.error('刪除失敗', e)
    alert('刪除失敗')
  }
}

function onFilterChange(status) {
  filterStatus.value = status
  currentPage.value = 1
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

function formatPrice(val) {
  return val != null ? `NT$ ${Number(val).toLocaleString()}` : 'NT$ 0'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-TW') + ' ' + d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

// 點擊外部關閉狀態下拉選單
function handleClickOutside(e) {
  if (!e.target.closest('.status-dropdown-wrap')) {
    closeStatusDropdown()
  }
}

onMounted(() => {
  loadOrders()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="order-manage">
    <!-- ====== 頁面標題 ====== -->
    <div class="mb-4">
      <h2 class="fw-bold mb-1" style="font-size: 1.5rem">
        <i class="bi bi-receipt me-2" style="color: var(--brand-sky)"></i>訂單管理
      </h2>
      <p class="text-secondary mb-0" style="font-size: 0.85rem">
        管理所有訂單，共 {{ orders.length }} 筆訂單
      </p>
    </div>

    <!-- ====== 統計卡片 ====== -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3" v-for="stat in ['UNPAID','PAID','SHIPPED','COMPLETED']" :key="stat">
        <div class="card card-rounded shadow-sm border-0">
          <div class="card-body p-3 d-flex align-items-center gap-3">
            <div
              class="d-flex align-items-center justify-content-center rounded-3"
              :style="{ width: '42px', height: '42px', backgroundColor: statusMap[stat].bg, color: statusMap[stat].color }"
            >
              <i :class="['bi', statusMap[stat].icon]" style="font-size: 1.1rem"></i>
            </div>
            <div>
              <div class="fw-bold" style="font-size: 1.25rem">{{ statusCounts[stat] || 0 }}</div>
              <div class="text-secondary" style="font-size: 0.75rem">{{ statusMap[stat].label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 工具列 ====== -->
    <div class="card card-rounded shadow-sm border-0 mb-4">
      <div class="card-body p-3">
        <!-- 狀態 Tabs -->
        <div class="d-flex flex-wrap gap-2 mb-3">
          <button
            v-for="tab in statusTabs"
            :key="tab.key"
            class="btn btn-sm status-tab"
            :class="{ active: filterStatus === tab.key }"
            @click="onFilterChange(tab.key)"
          >
            {{ tab.label }}
            <span class="tab-count">{{ statusCounts[tab.key] || 0 }}</span>
          </button>
        </div>
        <!-- 搜尋列 + 新增按鈕 -->
        <div class="d-flex justify-content-between align-items-center">
          <div class="input-group" style="max-width: 400px">
            <span class="input-group-text bg-white border-end-0">
              <i class="bi bi-search text-secondary"></i>
            </span>
            <input
              v-model="keyword"
              type="text"
              class="form-control border-start-0"
              placeholder="搜尋訂單編號、會員名稱、電話..."
            />
          </div>
          <button class="btn btn-brand" @click="openCreateOrder">
            <i class="bi bi-plus-lg me-1"></i>新增訂單
          </button>
        </div>
      </div>
    </div>

    <!-- ====== Loading ====== -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--brand-sky)" role="status"></div>
      <p class="text-secondary mt-2">載入訂單中...</p>
    </div>

    <!-- ====== 空狀態 ====== -->
    <div v-else-if="filteredOrders.length === 0" class="text-center py-5">
      <i class="bi bi-inbox" style="font-size: 3rem; color: #CBD5E1"></i>
      <p class="text-secondary mt-2">
        {{ orders.length === 0 ? '尚無任何訂單' : '沒有符合條件的訂單' }}
      </p>
    </div>

    <!-- ====== 訂單表格 ====== -->
    <div v-else class="card card-rounded shadow-sm border-0">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr style="background: #F8FAFC">
              <th style="width: 40px"></th>
              <th style="width: 10%">訂單編號</th>
              <th style="width: 15%">會員</th>
              <th style="width: 18%">訂單日期</th>
              <th style="width: 10%">付款方式</th>
              <th style="width: 12%" class="text-end">金額</th>
              <th style="width: 12%" class="text-center">狀態</th>
              <th style="width: 18%" class="text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="order in pagedOrders" :key="order.orderId">
              <!-- 訂單主列 -->
              <tr
                class="order-row"
                :class="{ expanded: expandedOrderId === order.orderId }"
                @click="toggleExpand(order)"
                style="cursor: pointer"
              >
                <td class="text-center">
                  <i
                    class="bi expand-icon"
                    :class="expandedOrderId === order.orderId ? 'bi-chevron-down' : 'bi-chevron-right'"
                  ></i>
                </td>
                <td>
                  <span class="fw-bold" style="color: var(--brand-dark)">#{{ order.orderId }}</span>
                </td>
                <td>
                  <div class="fw-semibold" style="font-size: 0.9rem">{{ order.member?.fullName || '未知' }}</div>
                  <div class="text-secondary" style="font-size: 0.75rem">{{ order.member?.phone || '' }}</div>
                </td>
                <td style="font-size: 0.85rem">{{ formatDate(order.orderDate) }}</td>
                <td>
                  <span v-if="order.paymentType" class="badge-payment">
                    {{ paymentMap[order.paymentType] || order.paymentType }}
                  </span>
                  <span v-else class="text-secondary" style="font-size: 0.8rem">未設定</span>
                </td>
                <td class="text-end">
                  <span class="fw-bold" style="color: var(--brand-teal)">{{ formatPrice(order.totalAmount) }}</span>
                </td>
                <td class="text-center">
                  <span
                    class="order-status-badge"
                    :style="{ backgroundColor: statusMap[order.status]?.bg, color: statusMap[order.status]?.color }"
                  >
                    <i :class="['bi', statusMap[order.status]?.icon]" class="me-1"></i>
                    {{ statusMap[order.status]?.label || order.status }}
                  </span>
                </td>
                <td class="text-center" @click.stop>
                  <div class="d-flex gap-2 justify-content-center">
                    <!-- 更新狀態（下拉選單） -->
                    <div class="status-dropdown-wrap">
                      <button
                        class="btn btn-sm action-btn action-btn-status"
                        :disabled="statusFlow[order.status]?.length === 0"
                        @click="toggleStatusDropdown(order.orderId)"
                      >
                        <i class="bi bi-arrow-repeat me-1"></i>狀態
                      </button>
                      <!-- 下拉選單 -->
                      <div
                        v-if="statusDropdownId === order.orderId && statusFlow[order.status]?.length > 0"
                        class="status-dropdown-menu"
                      >
                        <button
                          v-for="next in statusFlow[order.status]"
                          :key="next"
                          class="status-dropdown-item"
                          :style="{ color: statusMap[next]?.color }"
                          @click="changeStatus(order, next); closeStatusDropdown()"
                        >
                          <i :class="['bi', statusMap[next]?.icon]" class="me-1"></i>
                          {{ statusMap[next]?.label }}
                        </button>
                      </div>
                    </div>
                    <!-- 修改 -->
                    <button class="btn btn-sm action-btn action-btn-edit" @click="openEdit(order)">
                      <i class="bi bi-pencil me-1"></i>修改
                    </button>
                    <!-- 刪除 -->
                    <button class="btn btn-sm action-btn action-btn-delete" @click="confirmDelete(order)">
                      <i class="bi bi-trash3 me-1"></i>刪除
                    </button>
                  </div>
                </td>
              </tr>

              <!-- 展開：訂單明細 -->
              <tr v-if="expandedOrderId === order.orderId" class="detail-row">
                <td colspan="8" class="p-0">
                  <div class="detail-panel">
                    <!-- 備註 -->
                    <div v-if="order.note" class="mb-3 p-2 rounded-3" style="background: #FFFBEB; font-size: 0.85rem">
                      <i class="bi bi-sticky me-1" style="color: #F59E0B"></i>
                      <strong>備註：</strong>{{ order.note }}
                    </div>

                    <!-- 明細載入中 -->
                    <div v-if="loadingItems" class="text-center py-3">
                      <div class="spinner-border spinner-border-sm" style="color: var(--brand-sky)"></div>
                      <span class="text-secondary ms-2" style="font-size: 0.85rem">載入明細中...</span>
                    </div>

                    <!-- 無明細 -->
                    <div v-else-if="orderItems.length === 0" class="text-center py-3 text-secondary" style="font-size: 0.85rem">
                      此訂單尚無明細項目
                    </div>

                    <!-- 明細表格 -->
                    <table v-else class="table table-sm mb-0">
                      <thead>
                        <tr style="background: #F8FAFC; font-size: 0.8rem">
                          <th>商品</th>
                          <th class="text-center">單價</th>
                          <th class="text-center">數量</th>
                          <th class="text-end">小計</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in orderItems" :key="item.itemId">
                          <td>
                            <div class="d-flex align-items-center gap-2">
                              <img
                                v-if="item.product?.imageUrl"
                                :src="item.product.imageUrl.startsWith('/') || item.product.imageUrl.startsWith('http') ? item.product.imageUrl : '/' + item.product.imageUrl"
                                class="rounded"
                                style="width: 36px; height: 36px; object-fit: cover"
                              />
                              <div
                                v-else
                                class="rounded d-flex align-items-center justify-content-center"
                                style="width: 36px; height: 36px; background: #F1F5F9"
                              >
                                <i class="bi bi-box-seam" style="color: #CBD5E1; font-size: 0.8rem"></i>
                              </div>
                              <span class="fw-semibold" style="font-size: 0.85rem">
                                {{ item.product?.productName || '未知商品' }}
                              </span>
                            </div>
                          </td>
                          <td class="text-center" style="font-size: 0.85rem">{{ formatPrice(item.unitPrice) }}</td>
                          <td class="text-center" style="font-size: 0.85rem">× {{ item.quantity }}</td>
                          <td class="text-end fw-bold" style="font-size: 0.85rem; color: var(--brand-teal)">
                            {{ formatPrice(item.subtotal) }}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr style="border-top: 2px solid #E2E8F0">
                          <td colspan="3" class="text-end fw-bold" style="font-size: 0.9rem">訂單總計</td>
                          <td class="text-end fw-bold" style="font-size: 1rem; color: var(--brand-teal)">
                            {{ formatPrice(order.totalAmount) }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====== 分頁 ====== -->
    <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
      <ul class="pagination pagination-custom">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <button class="page-link" @click="goToPage(currentPage - 1)"><i class="bi bi-chevron-left"></i></button>
        </li>
        <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: currentPage === page }">
          <button class="page-link" @click="goToPage(page)">{{ page }}</button>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <button class="page-link" @click="goToPage(currentPage + 1)"><i class="bi bi-chevron-right"></i></button>
        </li>
      </ul>
    </nav>

    <!-- ====== 編輯 Modal ====== -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-container">
        <div class="modal-header-custom">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-pencil-square me-2" style="color: var(--brand-sky)"></i>
            編輯訂單 #{{ editForm.orderId }}
          </h5>
          <button class="btn-close" @click="showModal = false"></button>
        </div>
        <div class="modal-body-custom">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label small fw-semibold">訂單狀態</label>
              <select v-model="editForm.status" class="form-select">
                <option v-for="[val, info] in statusOptions" :key="val" :value="val">{{ info.label }}</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">付款方式</label>
              <select v-model="editForm.paymentType" class="form-select">
                <option value="">未設定</option>
                <option value="CASH">現金</option>
                <option value="CREDIT_CARD">信用卡</option>
                <option value="TRANSFER">轉帳</option>
                <option value="LINE_PAY">LINE Pay</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">備註</label>
              <textarea v-model="editForm.note" class="form-control" rows="3" placeholder="訂單備註..."></textarea>
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
      :message="`確定要刪除訂單 #${deleteTarget?.orderId} 嗎？訂單明細也會一併刪除，此操作無法復原。`"
      @confirm="handleDelete"
      @cancel="showConfirm = false"
    />

    <!-- ====== 新增訂單 Modal ====== -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-container" style="max-width: 720px">
        <div class="modal-header-custom">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-cart-plus me-2" style="color: var(--brand-teal)"></i>
            新增訂單
          </h5>
          <button class="btn-close" @click="showCreateModal = false"></button>
        </div>
        <div class="modal-body-custom">
          <!-- 會員搜尋 -->
          <div class="mb-3">
            <label class="form-label small fw-semibold">會員 <span class="text-danger">*</span></label>
            <div v-if="selectedMember" class="selected-member-card">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-person-check-fill" style="color: var(--brand-teal); font-size: 1.2rem"></i>
                <div>
                  <div class="fw-semibold">{{ selectedMember.fullName || selectedMember.username }}</div>
                  <div class="text-secondary" style="font-size: 0.75rem">{{ selectedMember.phone || '' }} · ID: {{ selectedMember.memberId }}</div>
                </div>
              </div>
              <button class="btn btn-sm btn-outline-secondary" @click="clearMember">
                <i class="bi bi-x-lg"></i> 重選
              </button>
            </div>
            <div v-else class="position-relative">
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="bi bi-search text-secondary"></i></span>
                <input
                  v-model="memberKeyword"
                  type="text"
                  class="form-control"
                  placeholder="輸入姓名或手機搜尋會員..."
                  @input="onMemberInput"
                  @focus="memberKeyword.length > 0 && (showMemberDropdown = true)"
                  autocomplete="off"
                />
                <span v-if="searchingMember" class="input-group-text bg-white">
                  <div class="spinner-border spinner-border-sm text-secondary"></div>
                </span>
              </div>
              <!-- 搜尋結果下拉 -->
              <div v-if="showMemberDropdown && memberResults.length > 0" class="member-dropdown">
                <button
                  v-for="m in memberResults"
                  :key="m.memberId"
                  class="member-dropdown-item"
                  @click="pickMember(m)"
                >
                  <i class="bi bi-person me-2" style="color: var(--brand-sky)"></i>
                  <span class="fw-semibold">{{ m.fullName || m.username }}</span>
                  <span class="text-secondary ms-2" style="font-size: 0.75rem">{{ m.phone || '' }}</span>
                </button>
              </div>
              <div v-else-if="showMemberDropdown && memberKeyword.length > 0 && !searchingMember" class="member-dropdown">
                <div class="text-center text-secondary py-2" style="font-size: 0.85rem">找不到符合的會員</div>
              </div>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label small fw-semibold">付款方式</label>
              <select v-model="createForm.paymentType" class="form-select">
                <option value="">請選擇</option>
                <option value="CASH">現金</option>
                <option value="CREDIT_CARD">信用卡</option>
                <option value="TRANSFER">轉帳</option>
                <option value="LINE_PAY">LINE Pay</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">備註</label>
              <input v-model="createForm.note" type="text" class="form-control" placeholder="選填" />
            </div>
          </div>

          <hr />

          <!-- 商品選擇區 -->
          <label class="form-label fw-semibold">
            <i class="bi bi-cart-plus me-1" style="color: var(--brand-teal)"></i>加入商品
          </label>
          <div class="row g-2 mb-3">
            <div class="col">
              <select v-model="selectedProductId" class="form-select form-select-sm">
                <option value="">請選擇商品</option>
                <option
                  v-for="p in products"
                  :key="p.productId"
                  :value="p.productId"
                >{{ p.productName }} ({{ p.brand }}) - NT${{ p.price.toLocaleString() }} [庫存:{{ p.stockQty }}]</option>
              </select>
            </div>
            <div class="col-auto" style="width: 80px">
              <input v-model.number="selectQty" type="number" class="form-control form-control-sm" min="1" placeholder="數量" />
            </div>
            <div class="col-auto">
              <button class="btn btn-sm btn-success" @click="addToCart">
                <i class="bi bi-plus-lg me-1"></i>加入
              </button>
            </div>
          </div>

          <!-- 購物車明細表 -->
          <div class="cart-table-wrap">
            <table class="table table-sm mb-0">
              <thead>
                <tr style="background: #F8FAFC; font-size: 0.8rem">
                  <th>商品</th>
                  <th class="text-center">單價</th>
                  <th class="text-center" style="width: 120px">數量</th>
                  <th class="text-end">小計</th>
                  <th style="width: 40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cart.length === 0">
                  <td colspan="5" class="text-center text-secondary py-3" style="font-size: 0.85rem">
                    <i class="bi bi-cart me-1"></i>尚未加入商品
                  </td>
                </tr>
                <tr v-for="(item, idx) in cart" :key="item.productId">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl.startsWith('/') || item.imageUrl.startsWith('http') ? item.imageUrl : '/' + item.imageUrl"
                        class="rounded"
                        style="width: 32px; height: 32px; object-fit: cover"
                      />
                      <span class="fw-semibold" style="font-size: 0.85rem">{{ item.name }}</span>
                    </div>
                  </td>
                  <td class="text-center" style="font-size: 0.85rem">NT$ {{ item.price.toLocaleString() }}</td>
                  <td class="text-center">
                    <div class="d-flex align-items-center justify-content-center gap-1">
                      <button class="btn btn-sm btn-outline-secondary" style="padding: 0 6px; font-size: 0.75rem" @click="updateCartQty(idx, -1)">−</button>
                      <span class="fw-bold" style="min-width: 24px; text-align: center">{{ item.quantity }}</span>
                      <button class="btn btn-sm btn-outline-secondary" style="padding: 0 6px; font-size: 0.75rem" @click="updateCartQty(idx, 1)">+</button>
                    </div>
                  </td>
                  <td class="text-end fw-bold" style="font-size: 0.85rem; color: var(--brand-teal)">NT$ {{ (item.price * item.quantity).toLocaleString() }}</td>
                  <td class="text-center">
                    <button class="btn btn-sm text-danger" style="padding: 0 4px" @click="removeFromCart(idx)">
                      <i class="bi bi-x-lg" style="font-size: 0.7rem"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="cart.length > 0">
                <tr style="border-top: 2px solid #E2E8F0">
                  <td colspan="3" class="text-end fw-bold" style="font-size: 0.9rem">訂單合計</td>
                  <td class="text-end fw-bold" style="font-size: 1.1rem; color: var(--brand-teal)">NT$ {{ cartTotal.toLocaleString() }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div class="modal-footer-custom">
          <button class="btn btn-outline-secondary" @click="showCreateModal = false">取消</button>
          <button class="btn btn-brand" :disabled="creating || !selectedMember || cart.length === 0" @click="handleCreateOrder">
            <span v-if="creating" class="spinner-border spinner-border-sm me-1"></span>
            {{ creating ? '建立中...' : '送出訂單' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 表格 ===== */
table th {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid #F1F5F9;
}
table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #F1F5F9;
}

/* ===== 訂單列 ===== */
.order-row {
  transition: background 0.2s ease;
}
.order-row:hover {
  background: #F8FAFC !important;
}
.order-row.expanded {
  background: #F0F9FF !important;
}
.expand-icon {
  font-size: 0.75rem;
  color: #94A3B8;
  transition: transform 0.2s ease;
}
.order-row.expanded .expand-icon {
  color: var(--brand-sky);
}

/* ===== 狀態 Badge ===== */
.order-status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
}

/* ===== 付款 Badge ===== */
.badge-payment {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 0.375rem;
  background: #F1F5F9;
  color: #475569;
}

/* ===== 狀態 Tabs ===== */
.status-tab {
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid #E2E8F0;
  background: white;
  color: #64748B;
  transition: all 0.2s ease;
}
.status-tab:hover {
  border-color: var(--brand-sky);
  color: var(--brand-sky);
}
.status-tab.active {
  background: var(--brand-sky);
  border-color: var(--brand-sky);
  color: white;
}
.tab-count {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.08);
  padding: 0 0.4rem;
  border-radius: 9999px;
  margin-left: 0.3rem;
}
.status-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
}

/* ===== 展開明細 ===== */
.detail-row td {
  background: #FAFBFC;
}
.detail-panel {
  padding: 1rem 1.5rem 1rem 3rem;
  animation: slideDown 0.25s ease;
}

/* ===== 分頁 ===== */
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
  max-width: 560px;
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

/* ===== 動畫 ===== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}

/* ===== 操作按鈕 ===== */
.action-btn {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.action-btn-status {
  background: #F0F9FF;
  color: var(--brand-sky, #0EA5E9);
  border: 1px solid #BAE6FD;
}
.action-btn-status:hover:not(:disabled) {
  background: var(--brand-sky, #0EA5E9);
  color: white;
  border-color: var(--brand-sky, #0EA5E9);
}
.action-btn-status:disabled {
  background: #F1F5F9;
  color: #CBD5E1;
  border-color: #E2E8F0;
  cursor: not-allowed;
  opacity: 0.6;
}
.action-btn-edit {
  background: #EEF2FF;
  color: #6366F1;
  border: 1px solid #C7D2FE;
}
.action-btn-edit:hover {
  background: #6366F1;
  color: white;
  border-color: #6366F1;
}
.action-btn-delete {
  background: #FEF2F2;
  color: #EF4444;
  border: 1px solid #FECACA;
}
.action-btn-delete:hover {
  background: #EF4444;
  color: white;
  border-color: #EF4444;
}

/* ===== 狀態下拉選單 ===== */
.status-dropdown-wrap {
  position: relative;
}
.status-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #F1F5F9;
  padding: 0.35rem;
  z-index: 100;
  min-width: 120px;
  animation: fadeIn 0.15s ease;
}
.status-dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.45rem 0.75rem;
  border: none;
  background: none;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.15s ease;
}
.status-dropdown-item:hover {
  background: #F8FAFC;
}

/* ===== 新增訂單 — 會員搜尋 ===== */
.selected-member-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  border-radius: 0.75rem;
}
.member-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1060;
  animation: fadeIn 0.15s ease;
}
.member-dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s ease;
}
.member-dropdown-item:hover {
  background: #F0F9FF;
}

/* ===== 新增訂單 — 購物車 ===== */
.cart-table-wrap {
  border: 1px solid #E2E8F0;
  border-radius: 0.75rem;
  overflow: hidden;
}
</style>
