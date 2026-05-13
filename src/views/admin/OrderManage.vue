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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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

// ===================== C 版面：選中訂單 + 側邊面板 =====================
const selectedOrder = ref(null)
const activeTab = ref('info')
const orderItems = ref([])
const loadingItems = ref(false)

function selectOrder(order) {
  selectedOrder.value = order
  activeTab.value = 'info'
}
function closeDetail() {
  selectedOrder.value = null
}
watch(selectedOrder, async (order) => {
  if (!order) { orderItems.value = []; return }
  loadingItems.value = true
  try {
    orderItems.value = await orderApi.findItems(order.orderId)
  } catch (e) {
    console.error('載入明細失敗', e)
    orderItems.value = []
  } finally {
    loadingItems.value = false
  }
})

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
  UNPAID:    { label: '訂單成立', color: '#F59E0B', bg: '#FEF3C7', icon: 'bi-clipboard-check' },
  PAID:      { label: '備貨中', color: '#3B82F6', bg: '#DBEAFE', icon: 'bi-box-seam' },
  SHIPPED:   { label: '待取貨', color: '#8B5CF6', bg: '#EDE9FE', icon: 'bi-shop' },
  COMPLETED: { label: '已取貨', color: '#10B981', bg: '#D1FAE5', icon: 'bi-check2-circle' },
  CANCELLED: { label: '已取消', color: '#F43F5E', bg: '#FFE4E6', icon: 'bi-x-circle' },
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
  { key: 'UNPAID', label: '訂單成立' },
  { key: 'PAID', label: '備貨中' },
  { key: 'SHIPPED', label: '待取貨' },
  { key: 'COMPLETED', label: '已取貨' },
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

// 頂部數據儀表板
const dashboardStats = computed(() => {
  const todayStr = new Date().toISOString().split('T')[0] // 格式: YYYY-MM-DD
  const monthStr = todayStr.substring(0, 7) // 格式: YYYY-MM
  let todayCount = 0
  let todaySales = 0
  let pendingCount = 0
  let monthSales = 0

  orders.value.forEach(o => {
    // 待處理訂單
    if (['UNPAID', 'PAID'].includes(o.status)) {
      pendingCount++
    }
    
    // 今日訂單數 (不論狀態都算)
    if (o.orderDate && o.orderDate.startsWith(todayStr)) {
      todayCount++
    }

    // 計算營收 (排除已取消)
    if (o.status !== 'CANCELLED') {
      if (o.orderDate && o.orderDate.startsWith(todayStr)) {
        todaySales += o.totalAmount
      }
      if (o.orderDate && o.orderDate.startsWith(monthStr)) {
        monthSales += o.totalAmount
      }
    }
  })

  return {
    monthRevenue: monthSales,
    todayOrders: todayCount,
    pendingOrders: pendingCount,
    todayRevenue: todaySales
  }
})

// 進度條輔助方法
const progressSteps = ['UNPAID', 'PAID', 'SHIPPED', 'COMPLETED']
function isStepActive(currentStatus, step) {
  if (currentStatus === 'CANCELLED') return false
  const currentIndex = progressSteps.indexOf(currentStatus)
  const stepIndex = progressSteps.indexOf(step)
  return stepIndex <= currentIndex
}
function getProgressWidth(currentStatus) {
  if (currentStatus === 'CANCELLED') return '0%'
  const index = progressSteps.indexOf(currentStatus)
  if (index === -1) return '0%'
  return (index / (progressSteps.length - 1)) * 100 + '%'
}

// ===================== 方法 =====================
async function loadOrders() {
  loading.value = true
  try {
    orders.value = await orderApi.findAll()
    if (selectedOrder.value) {
      const updated = orders.value.find(o => o.orderId === selectedOrder.value.orderId)
      selectedOrder.value = updated || null
    }
  } catch (e) {
    console.error('載入訂單失敗', e)
    alert('載入訂單失敗，請確認後端是否已啟動')
  } finally {
    loading.value = false
  }
}

// (C 版面已用 watch 自動載入明細)

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
    <!-- ====== 頂部數據儀表板 Banner ====== -->
    <div class="dashboard-banner mb-4 shadow-sm">
      <div class="row text-center g-0">
        <div class="col-6 col-md-3 stat-block">
          <div class="stat-label">本月累積營收</div>
          <div class="stat-value" style="color: var(--brand-sky);">{{ formatPrice(dashboardStats.monthRevenue) }}</div>
        </div>
        <div class="col-6 col-md-3 stat-block">
          <div class="stat-label">今日訂單</div>
          <div class="stat-value">{{ dashboardStats.todayOrders }}</div>
        </div>
        <div class="col-6 col-md-3 stat-block">
          <div class="stat-label">待處理訂單</div>
          <div class="stat-value">{{ dashboardStats.pendingOrders }}</div>
        </div>
        <div class="col-6 col-md-3 stat-block border-end-0">
          <div class="stat-label">今日銷售額</div>
          <div class="stat-value text-brand">{{ formatPrice(dashboardStats.todayRevenue) }}</div>
        </div>
      </div>
    </div>

    <!-- ====== 頁面標題 & 新增按鈕 ====== -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h2 class="fw-bold mb-0" style="font-size: 1.5rem">
          <i class="bi bi-receipt me-2" style="color: var(--brand-sky)"></i>訂單管理
        </h2>
      </div>
      <button class="btn btn-brand" @click="openCreateOrder"><i class="bi bi-plus-lg me-1"></i>新增訂單</button>
    </div>
    <!-- ====== 工具列 (狀態比例圖 + 搜尋框) ====== -->
    <div class="card card-rounded shadow-sm border-0 mb-3">
      <div class="card-body p-3 d-flex flex-column flex-md-row align-items-center gap-4">
        <!-- 狀態長條比例圖 (篩選器) -->
        <div class="flex-grow-1 w-100">
          <div class="d-flex justify-content-between align-items-end mb-2" style="color: #64748B;">
            <span class="fw-bold" style="font-size: 0.85rem;"><i class="bi bi-funnel me-1"></i>訂單狀態分佈 (點擊篩選)</span>
            <div class="d-flex align-items-center" style="font-size: 0.95rem;">
              <span v-if="filterStatus" class="badge bg-secondary me-3 px-3 py-2 shadow-sm" style="cursor:pointer; font-size: 0.85rem;" @click="onFilterChange('')"><i class="bi bi-x-circle me-1"></i>清除篩選</span>
              <span class="fw-bold text-dark" style="letter-spacing: 0.5px;">總計 {{ Number(statusCounts[''] || 0).toLocaleString() }} 筆</span>
            </div>
          </div>
          <div class="status-stacked-bar">
            <!-- 我們只顯示有數量的狀態 -->
            <template v-for="tab in statusTabs.slice(1)" :key="tab.key">
              <div v-if="statusCounts[tab.key] > 0" 
                   class="stacked-segment"
                   :class="{ 'is-dimmed': filterStatus && filterStatus !== tab.key, 'is-active': filterStatus === tab.key }"
                   :style="{ 
                     width: (statusCounts[tab.key] / statusCounts[''] * 100) + '%', 
                     backgroundColor: statusMap[tab.key]?.color,
                     color: 'white'
                   }"
                   @click="onFilterChange(tab.key)"
                   :title="tab.label + ': ' + statusCounts[tab.key] + '筆'">
                <span class="segment-label" v-if="(statusCounts[tab.key] / statusCounts[''] * 100) > 8">
                  {{ tab.label }} {{ statusCounts[tab.key] }}
                </span>
              </div>
            </template>
            <!-- 若完全沒訂單的佔位 -->
            <div v-if="statusCounts[''] === 0" class="stacked-segment" style="width: 100%; background-color: #E2E8F0; color: #94A3B8;">無資料</div>
          </div>
        </div>

        <!-- 搜尋框 -->
        <div class="input-group" style="width: 100%; max-width: 320px; flex-shrink: 0;">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-secondary"></i></span>
          <input v-model="keyword" type="text" class="form-control border-start-0" placeholder="搜尋訂單編號、會員名稱..." />
        </div>
      </div>
    </div>
    <!-- ====== C 版面：左右分割 Master-Detail ====== -->
    <div class="c-layout" :class="{ 'has-detail': selectedOrder }">
      <!-- 左：訂單列表 -->
      <div class="c-master">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border" style="color: var(--brand-sky)" role="status"></div>
          <p class="text-secondary mt-2">載入訂單中...</p>
        </div>
        <div v-else-if="filteredOrders.length === 0" class="text-center py-5">
          <i class="bi bi-inbox" style="font-size: 3rem; color: #CBD5E1"></i>
          <p class="text-secondary mt-2">{{ orders.length === 0 ? '尚無任何訂單' : '沒有符合條件的訂單' }}</p>
        </div>
        <div v-else class="card card-rounded shadow-sm border-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead><tr style="background: #F8FAFC">
                <th style="width: 8%">編號</th><th style="width: 18%">會員</th><th style="width: 20%">訂購日期</th>
                <th style="width: 14%" class="text-end">金額</th><th style="width: 14%" class="text-center">狀態</th><th style="width: 26%" class="text-center">操作</th>
              </tr></thead>
              <tbody>
                <tr v-for="order in pagedOrders" :key="order.orderId" class="c-order-row"
                  :class="{ 'c-selected': selectedOrder?.orderId === order.orderId }"
                  @click="selectOrder(order)" style="cursor: pointer">
                  <td><span class="fw-bold" style="color: var(--brand-dark)">#{{ order.orderId }}</span></td>
                  <td><div class="fw-semibold" style="font-size: 0.85rem">{{ order.member?.fullName || '未知' }}</div><div class="text-secondary" style="font-size: 0.72rem">{{ order.member?.phone || '' }}</div></td>
                  <td style="font-size: 0.82rem">{{ formatDate(order.orderDate) }}</td>
                  <td class="text-end"><span class="fw-bold" style="color: var(--brand-teal)">{{ formatPrice(order.totalAmount) }}</span></td>
                  <td class="text-center"><span class="order-status-badge" :style="{ backgroundColor: statusMap[order.status]?.bg, color: statusMap[order.status]?.color }"><i :class="['bi', statusMap[order.status]?.icon]" class="me-1"></i>{{ statusMap[order.status]?.label }}</span></td>
                  <td class="text-center" @click.stop>
                    <div class="d-flex gap-1 justify-content-center">
                      <div class="status-dropdown-wrap">
                        <button class="btn btn-sm action-btn action-btn-status" :disabled="statusFlow[order.status]?.length === 0" @click="toggleStatusDropdown(order.orderId)"><i class="bi bi-arrow-repeat"></i></button>
                        <div v-if="statusDropdownId === order.orderId && statusFlow[order.status]?.length > 0" class="status-dropdown-menu">
                          <button v-for="next in statusFlow[order.status]" :key="next" class="status-dropdown-item" :style="{ color: statusMap[next]?.color }" @click="changeStatus(order, next); closeStatusDropdown()"><i :class="['bi', statusMap[next]?.icon]" class="me-1"></i>{{ statusMap[next]?.label }}</button>
                        </div>
                      </div>
                      <button class="btn btn-sm action-btn action-btn-edit" @click="openEdit(order)"><i class="bi bi-pencil"></i></button>
                      <button class="btn btn-sm action-btn action-btn-delete" @click="confirmDelete(order)"><i class="bi bi-trash3"></i></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <nav v-if="totalPages > 1" class="d-flex justify-content-center py-3">
            <ul class="pagination pagination-custom mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }"><button class="page-link" @click="goToPage(currentPage - 1)"><i class="bi bi-chevron-left"></i></button></li>
              <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: currentPage === page }"><button class="page-link" @click="goToPage(page)">{{ page }}</button></li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }"><button class="page-link" @click="goToPage(currentPage + 1)"><i class="bi bi-chevron-right"></i></button></li>
            </ul>
          </nav>
        </div>
      </div>
      <!-- 右：詳情側邊面板 -->
      <transition name="slide-panel">
        <div v-if="selectedOrder" class="c-detail">
          <div class="c-detail-inner">
            <div class="c-detail-header d-flex align-items-center">
              <div class="flex-grow-1">
                <h5 class="fw-bold mb-1" style="color: var(--brand-dark); font-size: 1.1rem"><i class="bi bi-receipt me-2" style="color: var(--brand-sky)"></i>#{{ selectedOrder.orderId }}</h5>
                <span class="order-status-badge" :style="{ backgroundColor: statusMap[selectedOrder.status]?.bg, color: statusMap[selectedOrder.status]?.color }"><i :class="['bi', statusMap[selectedOrder.status]?.icon]" class="me-1"></i>{{ statusMap[selectedOrder.status]?.label }}</span>
              </div>
              <div class="text-end me-3">
                <div class="text-secondary mb-1" style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px;">訂單總額</div>
                <div class="fw-bold" style="color: var(--brand-teal); font-size: 1.25rem; line-height: 1;">{{ formatPrice(selectedOrder.totalAmount) }}</div>
              </div>
              <button class="btn btn-sm btn-outline-secondary" @click="closeDetail" style="border-radius: 50%; width: 30px; height: 30px; padding: 0"><i class="bi bi-x-lg" style="font-size: 0.7rem"></i></button>
            </div>
            <div class="c-detail-tabs">
              <button v-for="t in [{key:'info',icon:'bi-info-circle',label:'資訊'},{key:'items',icon:'bi-box-seam',label:'明細'},{key:'notes',icon:'bi-sticky',label:'備註'}]" :key="t.key" class="c-tab-btn" :class="{ active: activeTab === t.key }" @click="activeTab = t.key"><i :class="['bi', t.icon]" class="me-1"></i>{{ t.label }}</button>
            </div>
            <div class="c-detail-body">
              <div v-if="activeTab === 'info'" class="c-tab-content">
                <div class="info-card mb-3 p-3">
                  <div class="row g-3">
                    <div class="col-12 border-bottom pb-2">
                      <div class="info-label"><i class="bi bi-person me-1"></i>訂購會員</div>
                      <div class="d-flex align-items-center gap-2 mb-1">
                        <span class="fw-bold" style="font-size: 0.95rem; color: var(--brand-dark);">{{ selectedOrder.member?.fullName || '未知' }}</span>
                        <span class="badge bg-light text-secondary border">{{ selectedOrder.member?.phone || '-' }}</span>
                      </div>
                      <div class="info-sub text-muted" style="font-size: 0.75rem;"><i class="bi bi-envelope me-1"></i>{{ selectedOrder.member?.email || '-' }}</div>
                    </div>
                    <div class="col-6">
                      <div class="info-label"><i class="bi bi-calendar3 me-1"></i>訂購日期</div>
                      <div class="info-value" style="font-size: 0.85rem;">{{ formatDate(selectedOrder.orderDate) }}</div>
                    </div>
                    <div class="col-6">
                      <div class="info-label"><i class="bi bi-credit-card me-1"></i>付款方式</div>
                      <div class="info-value" style="font-size: 0.85rem;">
                        <span class="badge" style="background: #F1F5F9; color: #475569;">{{ paymentMap[selectedOrder.paymentType] || '未設定' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 進度條區塊 -->
                <div class="info-card mt-3 pt-4 pb-3 px-3">
                  <div class="info-label mb-4"><i class="bi bi-flag me-1"></i>訂單處理進度</div>
                  <div class="progress-tracker">
                    <div class="progress-lines-wrap">
                      <div class="progress-line"></div>
                      <div class="progress-line-fill" 
                           :style="{ width: getProgressWidth(selectedOrder.status), backgroundColor: 'var(--brand-sky)' }"></div>
                    </div>
                    
                    <div v-for="(step, index) in ['UNPAID', 'PAID', 'SHIPPED', 'COMPLETED']" :key="step" 
                         class="progress-step" :class="{ 'active': isStepActive(selectedOrder.status, step), 'current': selectedOrder.status === step }">
                      <div class="step-circle" 
                           :style="isStepActive(selectedOrder.status, step) ? { borderColor: 'var(--brand-sky)', backgroundColor: selectedOrder.status === step ? 'white' : 'var(--brand-sky)' } : {}">
                        <i v-if="selectedOrder.status === step" :class="['bi', statusMap[step]?.icon]" :style="{ color: 'var(--brand-sky)', fontSize: '0.95rem' }"></i>
                        <i v-else-if="isStepActive(selectedOrder.status, step)" class="bi bi-check" style="color: white; font-size: 1.2rem;"></i>
                      </div>
                      <div class="step-label" :style="selectedOrder.status === step ? { color: 'var(--brand-sky)', fontWeight: '700' } : {}">
                        {{ statusMap[step]?.label }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- 若有可變更的下一步，顯示按鈕 -->
                  <div v-if="statusFlow[selectedOrder.status]?.length > 0" class="d-flex justify-content-center gap-2 mt-4 pt-3" style="border-top: 1px dashed #E2E8F0;">
                    <span class="text-secondary" style="font-size: 0.8rem; line-height: 30px;">手動更新進度：</span>
                    <button v-for="next in statusFlow[selectedOrder.status]" :key="next" class="btn btn-sm fw-bold" 
                      style="font-size: 0.85rem; padding: 0.35rem 1rem; border-radius: 8px; transition: all 0.2s;" 
                      :style="next === 'CANCELLED' ? { color: statusMap[next]?.color, border: '1px solid ' + statusMap[next]?.color, background: 'white' } : { color: 'white', background: statusMap[next]?.color, border: '1px solid ' + statusMap[next]?.color, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }" 
                      @click="changeStatus(selectedOrder, next)"
                      onmouseover="this.style.opacity='0.85'"
                      onmouseout="this.style.opacity='1'">
                      <i v-if="next !== 'CANCELLED'" :class="['bi', statusMap[next]?.icon]" class="me-1"></i>
                      <i v-else class="bi bi-x-lg me-1"></i>
                      {{ statusMap[next]?.label }}
                    </button>
                  </div>
                  <!-- 訂單取消提示 -->
                  <div v-if="selectedOrder.status === 'CANCELLED'" class="text-center mt-3 text-danger fw-bold" style="font-size: 0.9rem;">
                    <i class="bi bi-x-circle me-1"></i>此訂單已取消
                  </div>
                </div>
              </div>
              <div v-if="activeTab === 'items'" class="c-tab-content">
                <div v-if="loadingItems" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color: var(--brand-sky)"></div></div>
                <div v-else-if="orderItems.length === 0" class="text-center py-4 text-secondary" style="font-size: 0.85rem">尚無明細</div>
                <div v-else>
                  <div v-for="item in orderItems" :key="item.itemId" class="c-item-row">
                    <div class="d-flex align-items-center gap-3">
                      <img v-if="item.product?.imageUrl" :src="item.product.imageUrl.startsWith('/') || item.product.imageUrl.startsWith('http') ? item.product.imageUrl : '/' + item.product.imageUrl" class="rounded-3" style="width: 72px; height: 72px; object-fit: cover; border: 1px solid #E2E8F0; flex-shrink: 0;" />
                      <div v-else class="rounded-3 d-flex align-items-center justify-content-center" style="width: 72px; height: 72px; background: #F1F5F9; flex-shrink: 0;"><i class="bi bi-box-seam" style="color: #CBD5E1; font-size: 1.5rem"></i></div>
                      <div class="flex-grow-1">
                        <div class="fw-semibold" style="font-size: 0.9rem; color: var(--brand-dark); line-height: 1.4;">{{ item.product?.productName || '未知商品' }}</div>
                        <div class="text-secondary mt-1" style="font-size: 0.78rem">單價 {{ formatPrice(item.unitPrice) }} × {{ item.quantity }} 件</div>
                      </div>
                      <div class="fw-bold text-end" style="color: var(--brand-teal); font-size: 1rem; white-space: nowrap;">{{ formatPrice(item.subtotal) }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="activeTab === 'notes'" class="c-tab-content">
                <div v-if="selectedOrder.note" class="p-3 rounded-3" style="background: #FFFBEB; font-size: 0.85rem; line-height: 1.8"><i class="bi bi-sticky me-1" style="color: #F59E0B"></i>{{ selectedOrder.note }}</div>
                <div v-else class="text-center text-secondary py-4" style="font-size: 0.85rem">此訂單無備註</div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

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
/* ===== C 版面：左右分割 ===== */
.c-layout { display: flex; gap: 1rem; transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.c-master { flex: 1; min-width: 0; transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.c-layout.has-detail .c-master { flex: 0 0 58%; }
.c-detail { flex: 0 0 40%; min-width: 0; }
.c-detail-inner {
  background: white; border-radius: 1rem; box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  border: 1px solid #F1F5F9; overflow: hidden; position: sticky; top: 1rem;
  max-height: calc(100vh - 120px); display: flex; flex-direction: column;
}
.c-order-row { transition: background 0.15s ease; }
.c-order-row:hover { background: #F0F9FF !important; }
.c-order-row.c-selected { background: #E0F2FE !important; border-left: 3px solid var(--brand-sky); }
.c-detail-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid #F1F5F9;
  background: linear-gradient(135deg, #FAFBFC 0%, #F0F9FF 100%);
}
.c-detail-tabs { display: flex; gap: 0; border-bottom: 1px solid #F1F5F9; background: #FAFBFC; }
.c-tab-btn {
  flex: 1; padding: 0.55rem 0.25rem; border: none; background: none;
  color: #64748B; font-size: 0.75rem; font-weight: 600; cursor: pointer;
  border-bottom: 2px solid transparent; transition: all 0.2s ease;
}
.c-tab-btn:hover { color: var(--brand-sky); }
.c-tab-btn.active { color: var(--brand-sky); border-bottom-color: var(--brand-sky); background: white; }
.c-detail-body { flex: 1; overflow-y: auto; padding: 1rem 1.25rem; }
.c-tab-content { animation: fadeIn 0.2s ease; }
.c-item-row { padding: 0.5rem 0; border-bottom: 1px solid #F1F5F9; }
.c-item-row:last-child { border-bottom: none; }
.info-card { padding: 0.65rem 0.85rem; background: #FAFBFC; border-radius: 0.65rem; border: 1px solid #F1F5F9; }
.info-label { font-size: 0.68rem; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.2rem; }
.info-value { font-size: 0.95rem; font-weight: 700; color: var(--brand-dark); }
.info-sub { font-size: 0.72rem; color: #94A3B8; margin-top: 0.1rem; }
.stat-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
/* 側邊面板滑入動畫 */
.slide-panel-enter-active { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.slide-panel-leave-active { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
.slide-panel-enter-from { opacity: 0; transform: translateX(30px); }
.slide-panel-leave-to { opacity: 0; transform: translateX(30px); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
/* 儀表板 Banner */
.dashboard-banner {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
}
.stat-block {
  padding: 1.2rem 1rem;
  border-right: 1px solid #F1F5F9;
  transition: background 0.2s ease;
}
.stat-block:hover {
  background: #F8FAFC;
}
.stat-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748B;
  margin-bottom: 0.5rem;
}
.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1E293B;
}
.text-brand {
  color: var(--brand-teal);
}

/* 進度條樣式 */
.progress-tracker {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.progress-lines-wrap {
  position: absolute;
  top: 10px;
  left: 12.5%;
  right: 12.5%;
  height: 4px;
  z-index: 1;
}
.progress-line {
  width: 100%;
  height: 100%;
  background: #E2E8F0;
  border-radius: 2px;
}
.progress-line-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--brand-sky);
  z-index: 2;
  transition: width 0.4s ease;
  border-radius: 2px;
}
.progress-step {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25%;
}
.step-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 4px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
  color: white;
  font-size: 0.8rem;
}
.progress-step.active .step-circle {
  border-color: var(--brand-sky);
  background: var(--brand-sky);
}
.progress-step.current .step-circle {
  border-color: var(--brand-sky);
  background: white;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
}
.progress-step.current .step-circle::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-sky);
}
.step-label {
  font-size: 0.75rem;
  color: #94A3B8;
  font-weight: 600;
  transition: color 0.3s ease;
}
.progress-step.active .step-label {
  color: var(--brand-dark);
}

/* 堆疊長條比例圖 */
.status-stacked-bar {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
  cursor: pointer;
  background-color: #F8FAFC;
}
.stacked-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.7rem;
  font-weight: 600;
  transition: opacity 0.3s ease, filter 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,0.3);
}
.stacked-segment:last-child {
  border-right: none;
}
.stacked-segment:hover {
  filter: brightness(0.9);
}
.stacked-segment.is-dimmed {
  opacity: 0.3;
  filter: grayscale(0.6);
}
.stacked-segment.is-active {
  opacity: 1;
  filter: brightness(1);
}
.segment-label {
  padding: 0 4px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

</style>
