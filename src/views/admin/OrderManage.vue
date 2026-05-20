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
import { useExport } from '@/composables/useExport'

// ===================== 資料狀態 =====================
const orders = ref([])
const loading = ref(true)
const keyword = ref('')

// ===================== 匯出功能 =====================
const { exportData } = useExport()
const showExportMenu = ref(false)

function getExportData() {
  return filteredOrders.value.map((o) => ({
    訂單編號: o.orderId,
    會員: o.member?.fullName || '未知',
    電話: o.member?.phone || '',
    訂購日期: o.orderDate,
    金額: o.totalAmount,
    狀態: statusMap[o.status]?.label || o.status,
    付款方式: paymentMap[o.paymentType] || o.paymentType || '',
    備註: o.note || '',
  }))
}

function handleExport(format) {
  showExportMenu.value = false
  exportData(getExportData(), format, '訂單資料')
}
const filterStatus = ref('')

// ===================== 勾選（批次處理） =====================
const selectedIds = ref(new Set())

const isAllSelected = computed(() => {
  return (
    pagedOrders.value.length > 0 && pagedOrders.value.every((o) => selectedIds.value.has(o.orderId))
  )
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    pagedOrders.value.forEach((o) => selectedIds.value.delete(o.orderId))
  } else {
    pagedOrders.value.forEach((o) => selectedIds.value.add(o.orderId))
  }
}

function toggleSelect(orderId) {
  if (selectedIds.value.has(orderId)) {
    selectedIds.value.delete(orderId)
  } else {
    selectedIds.value.add(orderId)
  }
}

function clearSelection() {
  selectedIds.value = new Set()
}

// 批次變更狀態
const showBatchStatusMenu = ref(false)

// 批次狀態變更 — 使用置中 ConfirmDialog 取代瀏覽器原生 confirm()
const showBatchStatusConfirm = ref(false)
const pendingBatchStatus = ref('')
const pendingBatchIds = ref([])
const batchStatusConfirmMsg = ref('')

function batchChangeStatus(newStatus) {
  showBatchStatusMenu.value = false
  const ids = [...selectedIds.value]
  if (ids.length === 0) return
  const label = statusMap[newStatus]?.label || newStatus
  pendingBatchStatus.value = newStatus
  pendingBatchIds.value = ids
  batchStatusConfirmMsg.value = `確定要將 ${ids.length} 筆訂單批次變更為「${label}」嗎？`
  showBatchStatusConfirm.value = true
}

async function executeBatchStatusChange() {
  showBatchStatusConfirm.value = false
  const ids = pendingBatchIds.value
  const label = statusMap[pendingBatchStatus.value]?.label || pendingBatchStatus.value
  try {
    for (const id of ids) {
      await orderApi.updateStatus(id, pendingBatchStatus.value)
    }
    clearSelection()
    await loadOrders()
    // 使用結果提示 Dialog
    batchResultMsg.value = `已成功將 ${ids.length} 筆訂單變更為「${label}」`
    showBatchResult.value = true
  } catch (e) {
    console.error('批次狀態更新失敗', e)
    batchResultMsg.value = '部分訂單狀態更新失敗，請重新整理頁面確認'
    showBatchResult.value = true
    await loadOrders()
  }
}

// 通用結果提示 Dialog（取代 alert）
const showBatchResult = ref(false)
const batchResultMsg = ref('')

// 批次刪除
const showBatchDeleteConfirm = ref(false)
async function handleBatchDelete() {
  const ids = [...selectedIds.value]
  showBatchDeleteConfirm.value = false
  try {
    for (const id of ids) {
      await orderApi.delete(id)
    }
    clearSelection()
    await loadOrders()
    batchResultMsg.value = `已成功刪除 ${ids.length} 筆訂單`
    showBatchResult.value = true
  } catch (e) {
    console.error('批次刪除失敗', e)
    batchResultMsg.value = '部分訂單刪除失敗，請重新整理頁面確認'
    showBatchResult.value = true
    await loadOrders()
  }
}

// 批次匯出（只匯出勾選的）
function batchExport(format) {
  const ids = [...selectedIds.value]
  const selected = orders.value.filter((o) => ids.includes(o.orderId))
  const data = selected.map((o) => ({
    訂單編號: o.orderId,
    會員: o.member?.fullName || '未知',
    電話: o.member?.phone || '',
    訂購日期: o.orderDate,
    金額: o.totalAmount,
    狀態: statusMap[o.status]?.label || o.status,
    付款方式: paymentMap[o.paymentType] || o.paymentType || '',
    備註: o.note || '',
  }))
  exportData(data, format, '訂單資料')
}

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
  if (!order) {
    orderItems.value = []
    return
  }
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
  cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
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
    products.value = all.filter((p) => p.status === 'ACTIVE' && p.stockQty > 0)
  } catch (e) {
    console.error('載入商品失敗', e)
  }
}

// 加入購物車
function addToCart() {
  const pid = parseInt(selectedProductId.value)
  if (!pid) {
    alert('請選擇商品！')
    return
  }
  const qty = parseInt(selectQty.value) || 1
  const product = products.value.find((p) => p.productId === pid)
  if (!product) return

  const existing = cart.value.find((c) => c.productId === pid)
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
  if (newQty > item.stock) {
    alert(`庫存不足！剩餘 ${item.stock} 件`)
    return
  }
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
  if (!selectedMember.value) {
    alert('請選擇會員！')
    return
  }
  if (cart.value.length === 0) {
    alert('請至少加入一項商品！')
    return
  }

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
  UNPAID: { label: '訂單成立', color: '#F59E0B', bg: '#FEF3C7', icon: 'bi-clipboard-check', badgeClass: 'badge-unpaid' },
  PAID: { label: '備貨中', color: '#3B82F6', bg: '#DBEAFE', icon: 'bi-box-seam', badgeClass: 'badge-paid' },
  SHIPPED: { label: '待取貨', color: '#8B5CF6', bg: '#EDE9FE', icon: 'bi-shop', badgeClass: 'badge-shipped' },
  COMPLETED: { label: '已取貨', color: '#10B981', bg: '#D1FAE5', icon: 'bi-check2-circle', badgeClass: 'badge-active' },
  CANCELLED: { label: '已取消', color: '#F43F5E', bg: '#FFE4E6', icon: 'bi-x-circle', badgeClass: 'badge-cancelled' },
}
const statusOptions = Object.entries(statusMap)

const paymentMap = {
  CASH: '現金支付',
  CREDIT_CARD: '信用卡',
  TRANSFER: '銀行轉帳',
  LINE_PAY: 'LINE Pay',
}

// 狀態流程：定義每個狀態「可以」轉到哪些狀態
const statusFlow = {
  UNPAID: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
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
const sortBy = ref('default')

const filteredOrders = computed(() => {
  let result = orders.value.filter((o) => {
    const matchStatus = !filterStatus.value || o.status === filterStatus.value
    if (!keyword.value) return matchStatus
    const kw = keyword.value.trim().toLowerCase()

    // #開頭 → 精確比對訂單編號
    if (kw.startsWith('#')) {
      const id = kw.slice(1)
      return matchStatus && id !== '' && String(o.orderId) === id
    }

    // 一般模糊搜尋（所有欄位）
    const matchKeyword =
      String(o.orderId).includes(kw) ||
      o.member?.fullName?.toLowerCase().includes(kw) ||
      o.member?.phone?.includes(kw) ||
      o.member?.email?.toLowerCase().includes(kw) ||
      statusMap[o.status]?.label?.includes(kw) ||
      paymentMap[o.paymentType]?.includes(kw) ||
      String(o.totalAmount).includes(kw) ||
      o.orderDate?.includes(kw.replace(/\//g, '-')) ||
      o.note?.toLowerCase().includes(kw)
    return matchKeyword && matchStatus
  })

  // 排序處理
  if (sortBy.value === 'dateNewest') {
    result.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
  } else if (sortBy.value === 'dateOldest') {
    result.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate))
  } else if (sortBy.value === 'amountHighest') {
    result.sort((a, b) => b.totalAmount - a.totalAmount)
  } else if (sortBy.value === 'amountLowest') {
    result.sort((a, b) => a.totalAmount - b.totalAmount)
  } else {
    // 預設排序: 編號由大到小 (最新訂單)
    result.sort((a, b) => b.orderId - a.orderId)
  }

  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / pageSize)))

const filterLabel = computed(() => {
  if (!filterStatus.value) return '全部狀態'
  const tab = statusTabs.find(t => t.key === filterStatus.value)
  return tab ? tab.label : '狀態篩選'
})

const sortLabel = computed(() => {
  const map = {
    default: '預設 (最新訂單)',
    dateOldest: '日期由舊到新',
    amountHighest: '金額由高到低',
    amountLowest: '金額由低到高',
  }
  return map[sortBy.value] || '排序方式'
})

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

  orders.value.forEach((o) => {
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
    todayRevenue: todaySales,
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

// 取得各進度節點的時間
const stepTimeFields = {
  UNPAID: 'createdAt',
  PAID: 'paidAt',
  SHIPPED: 'shippedAt',
  COMPLETED: 'completedAt',
}
function getStepTime(order, step) {
  if (!order) return ''
  const field = stepTimeFields[step]
  const val = order[field]
  if (!val) return ''
  const d = new Date(val)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

// ===================== 方法 =====================
async function loadOrders() {
  loading.value = true
  try {
    orders.value = await orderApi.findAll()
    if (selectedOrder.value) {
      const updated = orders.value.find((o) => o.orderId === selectedOrder.value.orderId)
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

// 搜尋時自動跳回第 1 頁
watch(keyword, () => {
  currentPage.value = 1
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

function formatPrice(val) {
  return val != null ? `NT$ ${Number(val).toLocaleString()}` : 'NT$ 0'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return (
    d.toLocaleDateString('zh-TW') +
    ' ' +
    d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  )
}

// 點擊外部關閉狀態下拉選單 & 匯出選單 & 批次狀態選單
function handleClickOutside(e) {
  if (!e.target.closest('.status-dropdown-wrap')) {
    closeStatusDropdown()
  }
  if (!e.target.closest('.export-dropdown-wrap')) {
    showExportMenu.value = false
  }
  if (!e.target.closest('.batch-status-wrap')) {
    showBatchStatusMenu.value = false
  }
}

onMounted(() => {
  loadOrders()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function getInvoiceTypeText(order) {
  if (!order || !order.invoiceType) return '尚未設定'
  
  if (order.invoiceType === 'INDIVIDUAL') {
    if (!order.invoiceCarrier) return '個人電子發票 (現場取貨時隨貨交付)'
    if (order.invoiceCarrier.startsWith('/')) {
      return `個人電子發票 (手機條碼：${order.invoiceCarrier})`
    }
    if (/^[A-Z]{2}\d{14}$/.test(order.invoiceCarrier)) {
      return `個人電子發票 (自然人憑證：${order.invoiceCarrier})`
    }
    return `個人電子發票 (載具：${order.invoiceCarrier})`
  }
  
  if (order.invoiceType === 'DONATION') {
    const code = order.invoiceCarrier || ''
    const unitMap = {
      '919': '財團法人創世社會福利基金會',
      '25885': '財團法人伊甸社會福利基金會',
      '13579': '財團法人陽光社會福利基金會',
      '5678': '財團法人台灣兒童暨家庭扶助基金會',
      '520': '財團法人罕見疾病基金會',
      '135': '財團法人董氏基金會',
      '001': '財團法人羅慧夫顱顏基金會',
      '888': '財團法人台灣癌症基金會',
      '999': '財團法人喜憨兒社會福利基金會',
      '111': '財團法人弘道老人福利基金會'
    }
    if (unitMap[code]) {
      return `捐贈發票 (${unitMap[code]}，捐贈碼：${code})`
    }
    return `捐贈發票 (捐贈碼：${code || '未提供'})`
  }
  
  if (order.invoiceType === 'COMPANY') {
    return `公司發票 (統編：${order.invoiceTaxId || '未提供'})`
  }
  
  return '尚未設定'
}
</script>

<template>
  <div class="order-manage">
    <!-- ====== 頂部數據儀表板 Banner ====== -->
    <div class="dashboard-banner mb-4 shadow-sm">
      <div class="row text-center g-0">
        <div class="col-6 col-md-3 stat-block">
          <div class="stat-label">本月累積營收</div>
          <div class="stat-value" style="color: var(--brand-sky)">
            {{ formatPrice(dashboardStats.monthRevenue) }}
          </div>
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

    <!-- ====== 頁面標題 & 整合工具列 ====== -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
      <!-- 左側：標題與搜尋框 -->
      <div class="d-flex align-items-center gap-4">
        <h2 class="page-title mb-0" style="white-space: nowrap;"><i class="bi bi-receipt"></i> 訂單管理</h2>
        
        <div class="input-group" style="width: 280px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); border-radius: 0.5rem;">
          <span class="input-group-text bg-white border-end-0" style="border-radius: 0.5rem 0 0 0.5rem;">
            <i class="bi bi-search text-secondary"></i>
          </span>
          <input
            v-model="keyword"
            type="text"
            class="form-control border-start-0"
            placeholder="搜尋編號、會員、日期..."
            style="border-radius: 0 0.5rem 0.5rem 0;"
          />
        </div>
      </div>

      <!-- 右側：篩選、排序與新增按鈕 -->
      <div class="d-flex align-items-center gap-2 flex-wrap">
        
        <!-- 狀態篩選 Dropdown -->
        <div class="dropdown">
          <button class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown" style="border-radius: 0.5rem; padding: 0.5rem 1rem;">
            <i class="bi bi-funnel"></i>
            <span class="fw-semibold" style="font-size: 0.9rem;">{{ filterLabel }}</span>
            <span v-if="filterStatus" class="badge bg-secondary rounded-pill ms-1">{{ statusCounts[filterStatus] || 0 }}</span>
          </button>
          <ul class="dropdown-menu shadow-sm border-0" style="border-radius: 0.75rem; min-width: 200px; padding: 0.5rem 0;">
            <li><h6 class="dropdown-header text-muted fw-bold">訂單狀態</h6></li>
            <li>
              <button class="dropdown-item py-2 fw-medium d-flex justify-content-between align-items-center" :class="{active: filterStatus === ''}" @click="onFilterChange('')">
                <span>全部狀態</span>
                <span class="badge bg-light text-dark border">{{ statusCounts[''] || 0 }}</span>
              </button>
            </li>
            <li><hr class="dropdown-divider my-1"></li>
            <li v-for="tab in statusTabs.slice(1)" :key="tab.key">
              <button class="dropdown-item py-2 fw-medium d-flex justify-content-between align-items-center" :class="{active: filterStatus === tab.key}" @click="onFilterChange(tab.key)">
                <span>{{ tab.label }}</span>
                <span class="badge" :style="{ backgroundColor: statusMap[tab.key]?.color }">{{ statusCounts[tab.key] || 0 }}</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- 排序選單 Dropdown -->
        <div class="dropdown">
          <button class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown" style="border-radius: 0.5rem; padding: 0.5rem 1rem;">
            <i class="bi bi-sort-down"></i>
            <span class="fw-semibold" style="font-size: 0.9rem;">{{ sortLabel }}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="border-radius: 0.75rem; min-width: 180px; padding: 0.5rem 0;">
            <li><h6 class="dropdown-header text-muted fw-bold">排序方式</h6></li>
            <li><button class="dropdown-item py-2 fw-medium" :class="{active: sortBy === 'default'}" @click="sortBy = 'default'">預設 (最新訂單)</button></li>
            <li><button class="dropdown-item py-2 fw-medium" :class="{active: sortBy === 'dateOldest'}" @click="sortBy = 'dateOldest'">日期由舊到新</button></li>
            <li><hr class="dropdown-divider my-1"></li>
            <li><button class="dropdown-item py-2 fw-medium" :class="{active: sortBy === 'amountHighest'}" @click="sortBy = 'amountHighest'">金額由高到低</button></li>
            <li><button class="dropdown-item py-2 fw-medium" :class="{active: sortBy === 'amountLowest'}" @click="sortBy = 'amountLowest'">金額由低到高</button></li>
          </ul>
        </div>

        <!-- 批次刪除 (僅選取時顯示) -->
        <transition name="fade">
          <button v-if="selectedIds.size > 0" class="btn btn-outline-danger d-flex align-items-center gap-2" style="border-radius: 0.5rem; padding: 0.5rem 1rem;" @click="showBatchDeleteConfirm = true">
            <i class="bi bi-trash3"></i>
            <span class="fw-semibold" style="font-size: 0.9rem;">刪除 ({{ selectedIds.size }})</span>
          </button>
        </transition>

        <!-- 取消全選 (僅選取時顯示) -->
        <transition name="fade">
          <button v-if="selectedIds.size > 0" class="btn btn-outline-secondary d-flex align-items-center gap-2" style="border-radius: 0.5rem; padding: 0.5rem 1rem;" @click="clearSelection" title="取消選取">
            <i class="bi bi-x-lg"></i>
          </button>
        </transition>

        <!-- 匯出選單 (自動根據是否有勾選切換) -->
        <div class="dropdown ms-1">
          <button class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown" style="border-radius: 0.5rem; padding: 0.5rem 1rem;">
            <i class="bi bi-download"></i>
            <span class="fw-semibold" style="font-size: 0.9rem;">{{ selectedIds.size > 0 ? '匯出勾選' : '匯出全部' }}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="border-radius: 0.75rem; min-width: 160px; padding: 0.5rem 0;">
            <li><button class="dropdown-item py-2 fw-medium" @click="selectedIds.size > 0 ? batchExport('EXCEL') : handleExport('EXCEL')"><i class="bi bi-file-earmark-excel me-2 text-success"></i>匯出 Excel</button></li>
            <li><button class="dropdown-item py-2 fw-medium" @click="selectedIds.size > 0 ? batchExport('PDF') : handleExport('PDF')"><i class="bi bi-file-earmark-pdf me-2 text-danger"></i>匯出 PDF</button></li>
            <li><button class="dropdown-item py-2 fw-medium" @click="selectedIds.size > 0 ? batchExport('JSON') : handleExport('JSON')"><i class="bi bi-filetype-json me-2 text-primary"></i>匯出 JSON</button></li>
          </ul>
        </div>

        <!-- 新增訂單 -->
        <button class="btn-add ms-2" @click="openCreateOrder">
          <i class="bi bi-plus-lg"></i> 新增訂單
        </button>
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
          <i class="bi bi-inbox" style="font-size: 3rem; color: #cbd5e1"></i>
          <p class="text-secondary mt-2">
            {{ orders.length === 0 ? '尚無任何訂單' : '沒有符合條件的訂單' }}
          </p>
        </div>
        <div v-else class="card card-rounded shadow-sm border-0 overflow-hidden">
          <div class="table-responsive">
            <table class="table table-hover align-middle text-center mb-0">
              <thead>
                <tr>
                  <th style="width: 40px">
                    <input
                      type="checkbox"
                      class="form-check-input table-check"
                      :checked="isAllSelected"
                      @change="toggleSelectAll"
                      @click.stop
                    />
                  </th>
                  <th>編號</th>
                  <th>會員</th>
                  <th>訂購日期</th>
                  <th>金額</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in pagedOrders"
                  :key="order.orderId"
                  class="c-order-row"
                  :class="{ 'c-selected': selectedOrder?.orderId === order.orderId }"
                  @click="selectOrder(order)"
                  style="cursor: pointer"
                >
                  <td @click.stop>
                    <input
                      type="checkbox"
                      class="form-check-input table-check"
                      :checked="selectedIds.has(order.orderId)"
                      @change="toggleSelect(order.orderId)"
                    />
                  </td>
                  <td>
                    <span class="fw-bold" style="color: var(--brand-dark)"
                      >#{{ order.orderId }}</span
                    >
                  </td>
                  <td>
                    <div class="fw-semibold" style="font-size: 0.85rem">
                      {{ order.member?.fullName || '未知' }}
                    </div>
                    <div class="text-secondary" style="font-size: 0.72rem">
                      {{ order.member?.phone || '' }}
                    </div>
                  </td>
                  <td style="font-size: 0.82rem">{{ formatDate(order.orderDate) }}</td>
                  <td>
                    <span class="fw-bold" style="color: var(--brand-teal)">{{
                      formatPrice(order.totalAmount)
                    }}</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="statusMap[order.status]?.badgeClass || 'badge-default'"
                      ><i :class="['bi', statusMap[order.status]?.icon]" class="me-1"></i
                      >{{ statusMap[order.status]?.label }}</span
                    >
                  </td>
                  <td @click.stop>
                    <div class="d-flex gap-1 justify-content-center align-items-center">
                      <button
                        class="btn btn-sm action-btn action-btn-edit"
                        title="編輯"
                        @click="openEdit(order)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-sm action-btn action-btn-delete"
                        title="刪除"
                        @click="confirmDelete(order)"
                      >
                        <i class="bi bi-trash3"></i>
                      </button>
                      <div class="dropdown">
                        <button
                          class="btn btn-sm action-btn action-btn-status dropdown-toggle"
                          data-bs-toggle="dropdown"
                          title="變更狀態"
                        >
                          <i class="bi bi-arrow-repeat"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                          <li>
                            <button class="dropdown-item fw-semibold" :class="{ active: order.status === 'UNPAID' }" @click="changeStatus(order, 'UNPAID')">
                              <i class="bi bi-clipboard-check me-2" :style="{ color: order.status === 'UNPAID' ? '' : '#F59E0B' }"></i>訂單成立
                            </button>
                          </li>
                          <li>
                            <button class="dropdown-item fw-semibold" :class="{ active: order.status === 'PAID' }" @click="changeStatus(order, 'PAID')">
                              <i class="bi bi-box-seam me-2" :style="{ color: order.status === 'PAID' ? '' : '#3B82F6' }"></i>備貨中
                            </button>
                          </li>
                          <li>
                            <button class="dropdown-item fw-semibold" :class="{ active: order.status === 'SHIPPED' }" @click="changeStatus(order, 'SHIPPED')">
                              <i class="bi bi-shop me-2" :style="{ color: order.status === 'SHIPPED' ? '' : '#8B5CF6' }"></i>待取貨
                            </button>
                          </li>
                          <li>
                            <button class="dropdown-item fw-semibold" :class="{ active: order.status === 'COMPLETED' }" @click="changeStatus(order, 'COMPLETED')">
                              <i class="bi bi-check2-circle me-2" :style="{ color: order.status === 'COMPLETED' ? '' : '#10B981' }"></i>已取貨
                            </button>
                          </li>
                          <li>
                            <button class="dropdown-item fw-semibold text-danger" :class="{ active: order.status === 'CANCELLED' }" @click="changeStatus(order, 'CANCELLED')">
                              <i class="bi bi-x-circle me-2"></i>已取消
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
          <!-- 頁面資訊 + 分頁 -->
          <div class="table-footer">
            <div class="table-footer-left">
              <span v-if="selectedIds.size > 0" class="selected-count"
                ><i class="bi bi-check2-square me-1"></i>已選 {{ selectedIds.size }} 筆</span
              >
              <span
                >共 <strong>{{ filteredOrders.length }}</strong> 筆訂單</span
              >
            </div>
            <nav v-if="totalPages > 1" class="table-footer-center">
              <ul class="pagination pagination-custom mb-0">
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
            <div class="table-footer-right">
              顯示第 <strong>{{ (currentPage - 1) * pageSize + 1 }}</strong
              >–<strong>{{ Math.min(currentPage * pageSize, filteredOrders.length) }}</strong>
              筆，第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 頁
            </div>
          </div>
        </div>
      </div>
      <!-- 右：詳情側邊面板 -->
      <transition name="slide-panel">
        <div v-if="selectedOrder" class="c-detail">
          <div class="c-detail-inner">
            <div class="c-detail-header d-flex align-items-center">
              <div class="flex-grow-1">
                <h5 class="fw-bold mb-1" style="color: var(--brand-dark); font-size: 1.1rem">
                  <i class="bi bi-receipt me-2" style="color: var(--brand-sky)"></i>#{{
                    selectedOrder.orderId
                  }}
                </h5>
                <span
                  class="order-status-badge"
                  :style="{
                    backgroundColor: statusMap[selectedOrder.status]?.bg,
                    color: statusMap[selectedOrder.status]?.color,
                  }"
                  ><i :class="['bi', statusMap[selectedOrder.status]?.icon]" class="me-1"></i
                  >{{ statusMap[selectedOrder.status]?.label }}</span
                >
              </div>
              <div class="text-end me-3">
                <div
                  class="text-secondary mb-1"
                  style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px"
                >
                  訂單總額
                </div>
                <div
                  class="fw-bold"
                  style="color: var(--brand-teal); font-size: 1.25rem; line-height: 1"
                >
                  {{ formatPrice(selectedOrder.totalAmount) }}
                </div>
              </div>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="closeDetail"
                style="border-radius: 50%; width: 30px; height: 30px; padding: 0"
              >
                <i class="bi bi-x-lg" style="font-size: 0.7rem"></i>
              </button>
            </div>
            <div class="c-detail-tabs">
              <button
                v-for="t in [
                  { key: 'info', icon: 'bi-info-circle', label: '資訊' },
                  { key: 'items', icon: 'bi-box-seam', label: '明細' },
                  { key: 'notes', icon: 'bi-sticky', label: '備註' },
                ]"
                :key="t.key"
                class="c-tab-btn"
                :class="{ active: activeTab === t.key }"
                @click="activeTab = t.key"
              >
                <i :class="['bi', t.icon]" class="me-1"></i>{{ t.label }}
              </button>
            </div>
            <div class="c-detail-body">
              <div v-if="activeTab === 'info'" class="c-tab-content">
                <div class="info-card mb-3 p-3">
                  <div class="row g-3">
                    <div class="col-12 border-bottom pb-2">
                      <div class="info-label"><i class="bi bi-person me-1"></i>訂購會員</div>
                      <div class="d-flex align-items-center gap-2 mb-1">
                        <span
                          class="fw-bold"
                          style="font-size: 0.95rem; color: var(--brand-dark)"
                          >{{ selectedOrder.member?.fullName || '未知' }}</span
                        >
                        <span class="badge bg-light text-secondary border">{{
                          selectedOrder.member?.phone || '-'
                        }}</span>
                      </div>
                      <div class="info-sub text-muted" style="font-size: 0.75rem">
                        <i class="bi bi-envelope me-1"></i>{{ selectedOrder.member?.email || '-' }}
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="info-label"><i class="bi bi-calendar3 me-1"></i>訂購日期</div>
                      <div class="info-value" style="font-size: 0.85rem">
                        {{ formatDate(selectedOrder.orderDate) }}
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="info-label"><i class="bi bi-credit-card me-1"></i>付款方式</div>
                      <div class="info-value" style="font-size: 0.85rem">
                        <span class="badge" style="background: #f1f5f9; color: #475569">{{
                          paymentMap[selectedOrder.paymentType] || '未設定'
                        }}</span>
                      </div>
                    </div>
                    <div class="col-12 border-top pt-2 mt-3">
                      <div class="row g-3">
                        <div class="col-6 border-end">
                          <div class="info-label"><i class="bi bi-geo-alt me-1"></i>取貨資訊</div>
                          <div class="info-value" style="font-size: 0.85rem; color: var(--brand-dark); font-weight: 600;">
                            球館自取
                          </div>
                          <div class="text-muted mt-1" style="font-size: 0.7rem;">羽過天晴羽球館</div>
                        </div>
                        <div class="col-6">
                          <div class="info-label"><i class="bi bi-receipt me-1"></i>發票號碼</div>
                          <div class="info-value fw-bold mb-2" style="font-size: 0.85rem; color: var(--brand-teal);">
                            XY-{{ String(selectedOrder?.orderId || '').padStart(8, '0') }}
                          </div>
                          <div class="info-label"><i class="bi bi-card-heading me-1"></i>發票形式</div>
                          <div class="info-value" style="font-size: 0.85rem; color: var(--brand-dark); font-weight: 600;">
                            {{ getInvoiceTypeText(selectedOrder) }}
                          </div>
                        </div>
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
                      <div
                        class="progress-line-fill"
                        :style="{
                          width: getProgressWidth(selectedOrder.status),
                          backgroundColor: 'var(--brand-sky)',
                        }"
                      ></div>
                    </div>

                    <div
                      v-for="(step, index) in ['UNPAID', 'PAID', 'SHIPPED', 'COMPLETED']"
                      :key="step"
                      class="progress-step"
                      :class="{
                        active: isStepActive(selectedOrder.status, step),
                        current: selectedOrder.status === step && step !== 'COMPLETED',
                      }"
                    >
                      <div
                        class="step-circle"
                        :style="
                          isStepActive(selectedOrder.status, step)
                            ? {
                                borderColor: 'var(--brand-sky)',
                                backgroundColor:
                                  selectedOrder.status === step && step !== 'COMPLETED'
                                    ? 'white'
                                    : 'var(--brand-sky)',
                              }
                            : {}
                        "
                      >
                        <i
                          v-if="selectedOrder.status === step && step !== 'COMPLETED'"
                          :class="['bi', statusMap[step]?.icon]"
                          :style="{ color: 'var(--brand-sky)', fontSize: '0.95rem' }"
                        ></i>
                        <i
                          v-else-if="isStepActive(selectedOrder.status, step)"
                          class="bi bi-check"
                          style="color: white; font-size: 1.2rem"
                        ></i>
                      </div>
                      <div
                        class="step-label"
                        :style="
                          selectedOrder.status === step && step !== 'COMPLETED'
                            ? { color: 'var(--brand-sky)', fontWeight: '700' }
                            : {}
                        "
                      >
                        {{ statusMap[step]?.label }}
                      </div>
                      <div
                        class="step-time"
                        v-if="
                          isStepActive(selectedOrder.status, step) &&
                          getStepTime(selectedOrder, step)
                        "
                        :style="
                          selectedOrder.status === step && step !== 'COMPLETED'
                            ? { color: 'var(--brand-sky)', fontWeight: '700' }
                            : {}
                        "
                      >
                        {{ getStepTime(selectedOrder, step) }}
                      </div>
                    </div>
                  </div>

                  <!-- 若有可變更的下一步，顯示按鈕 -->
                  <div
                    v-if="statusFlow[selectedOrder.status]?.length > 0"
                    class="d-flex justify-content-center gap-2 mt-4 pt-3"
                    style="border-top: 1px dashed #e2e8f0"
                  >
                    <span class="text-secondary" style="font-size: 0.8rem; line-height: 30px"
                      >手動更新進度：</span
                    >
                    <button
                      v-for="next in statusFlow[selectedOrder.status]"
                      :key="next"
                      class="btn btn-sm fw-bold"
                      style="
                        font-size: 0.85rem;
                        padding: 0.35rem 1rem;
                        border-radius: 8px;
                        transition: all 0.2s;
                      "
                      :style="
                        next === 'CANCELLED'
                          ? {
                              color: statusMap[next]?.color,
                              border: '1px solid ' + statusMap[next]?.color,
                              background: 'white',
                            }
                          : {
                              color: 'white',
                              background: statusMap[next]?.color,
                              border: '1px solid ' + statusMap[next]?.color,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            }
                      "
                      @click="changeStatus(selectedOrder, next)"
                      onmouseover="this.style.opacity = '0.85'"
                      onmouseout="this.style.opacity = '1'"
                    >
                      <i
                        v-if="next !== 'CANCELLED'"
                        :class="['bi', statusMap[next]?.icon]"
                        class="me-1"
                      ></i>
                      <i v-else class="bi bi-x-lg me-1"></i>
                      {{ statusMap[next]?.label }}
                    </button>
                  </div>
                  <!-- 訂單取消提示 -->
                  <div
                    v-if="selectedOrder.status === 'CANCELLED'"
                    class="text-center mt-3 text-danger fw-bold"
                    style="font-size: 0.9rem"
                  >
                    <i class="bi bi-x-circle me-1"></i>此訂單已取消
                  </div>
                </div>
              </div>
              <div v-if="activeTab === 'items'" class="c-tab-content">
                <div v-if="loadingItems" class="text-center py-4">
                  <div
                    class="spinner-border spinner-border-sm"
                    style="color: var(--brand-sky)"
                  ></div>
                </div>
                <div
                  v-else-if="orderItems.length === 0"
                  class="text-center py-4 text-secondary"
                  style="font-size: 0.85rem"
                >
                  尚無明細
                </div>
                <div v-else>
                  <div v-for="item in orderItems" :key="item.itemId" class="c-item-row">
                    <div class="d-flex align-items-center gap-3">
                      <img
                        v-if="item.product?.imageUrl"
                        :src="
                          item.product.imageUrl.startsWith('/') ||
                          item.product.imageUrl.startsWith('http')
                            ? item.product.imageUrl
                            : '/' + item.product.imageUrl
                        "
                        class="rounded-3"
                        style="
                          width: 80px;
                          height: 80px;
                          object-fit: scale-down;
                          background: #fff;
                          border: 1.5px solid #e2e8f0;
                          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                          flex-shrink: 0;
                        "
                      />
                      <div
                        v-else
                        class="rounded-3 d-flex align-items-center justify-content-center"
                        style="
                          width: 80px;
                          height: 80px;
                          background: #f1f5f9;
                          border: 1.5px solid #e2e8f0;
                          flex-shrink: 0;
                        "
                      >
                        <i class="bi bi-box-seam" style="color: #cbd5e1; font-size: 1.6rem"></i>
                      </div>
                      <div class="flex-grow-1">
                        <div
                          class="fw-semibold"
                          style="font-size: 0.9rem; color: var(--brand-dark); line-height: 1.4"
                        >
                          {{ item.product?.productName || '未知商品' }}
                        </div>
                        <div class="text-secondary mt-1" style="font-size: 0.78rem">
                          單價 {{ formatPrice(item.unitPrice) }}
                          ×
                          {{ item.quantity }} 件
                        </div>
                      </div>
                      <div
                        class="fw-bold text-end"
                        style="color: var(--brand-teal); font-size: 1rem; white-space: nowrap"
                      >
                        {{ formatPrice(item.subtotal) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="activeTab === 'notes'" class="c-tab-content">
                <div
                  v-if="selectedOrder.note"
                  class="p-3 rounded-3"
                  style="background: #fffbeb; font-size: 0.85rem; line-height: 1.8"
                >
                  <i class="bi bi-sticky me-1" style="color: #f59e0b"></i>{{ selectedOrder.note }}
                </div>
                <div v-else class="text-center text-secondary py-4" style="font-size: 0.85rem">
                  此訂單無備註
                </div>
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
                <option v-for="[val, info] in statusOptions" :key="val" :value="val">
                  {{ info.label }}
                </option>
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
              <textarea
                v-model="editForm.note"
                class="form-control"
                rows="3"
                placeholder="訂單備註..."
              ></textarea>
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
    <!-- ====== 批次刪除確認 ====== -->
    <ConfirmDialog
      :visible="showBatchDeleteConfirm"
      title="批次刪除確認"
      :message="`確定要刪除已勾選的 ${selectedIds.size} 筆訂單嗎？訂單明細也會一併刪除，此操作無法復原。`"
      @confirm="handleBatchDelete"
      @cancel="showBatchDeleteConfirm = false"
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
            <label class="form-label small fw-semibold"
              >會員 <span class="text-danger">*</span></label
            >
            <div v-if="selectedMember" class="selected-member-card">
              <div class="d-flex align-items-center gap-2">
                <i
                  class="bi bi-person-check-fill"
                  style="color: var(--brand-teal); font-size: 1.2rem"
                ></i>
                <div>
                  <div class="fw-semibold">
                    {{ selectedMember.fullName || selectedMember.username }}
                  </div>
                  <div class="text-secondary" style="font-size: 0.75rem">
                    {{ selectedMember.phone || '' }} · ID: {{ selectedMember.memberId }}
                  </div>
                </div>
              </div>
              <button class="btn btn-sm btn-outline-secondary" @click="clearMember">
                <i class="bi bi-x-lg"></i> 重選
              </button>
            </div>
            <div v-else class="position-relative">
              <div class="input-group">
                <span class="input-group-text bg-white"
                  ><i class="bi bi-search text-secondary"></i
                ></span>
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
                  <span class="text-secondary ms-2" style="font-size: 0.75rem">{{
                    m.phone || ''
                  }}</span>
                </button>
              </div>
              <div
                v-else-if="showMemberDropdown && memberKeyword.length > 0 && !searchingMember"
                class="member-dropdown"
              >
                <div class="text-center text-secondary py-2" style="font-size: 0.85rem">
                  找不到符合的會員
                </div>
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
              <input
                v-model="createForm.note"
                type="text"
                class="form-control"
                placeholder="選填"
              />
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
                <option v-for="p in products" :key="p.productId" :value="p.productId">
                  {{ p.productName }} ({{ p.brand }}) - NT${{ p.price.toLocaleString() }} [庫存:{{
                    p.stockQty
                  }}]
                </option>
              </select>
            </div>
            <div class="col-auto" style="width: 80px">
              <input
                v-model.number="selectQty"
                type="number"
                class="form-control form-control-sm"
                min="1"
                placeholder="數量"
              />
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
                <tr style="background: #f8fafc; font-size: 0.8rem">
                  <th>商品</th>
                  <th class="text-center">單價</th>
                  <th class="text-center" style="width: 120px">數量</th>
                  <th class="text-end">小計</th>
                  <th style="width: 40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cart.length === 0">
                  <td
                    colspan="5"
                    class="text-center text-secondary py-3"
                    style="font-size: 0.85rem"
                  >
                    <i class="bi bi-cart me-1"></i>尚未加入商品
                  </td>
                </tr>
                <tr v-for="(item, idx) in cart" :key="item.productId">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <img
                        v-if="item.imageUrl"
                        :src="
                          item.imageUrl.startsWith('/') || item.imageUrl.startsWith('http')
                            ? item.imageUrl
                            : '/' + item.imageUrl
                        "
                        class="rounded"
                        style="width: 32px; height: 32px; object-fit: cover"
                      />
                      <span class="fw-semibold" style="font-size: 0.85rem">{{ item.name }}</span>
                    </div>
                  </td>
                  <td class="text-center" style="font-size: 0.85rem">
                    NT$ {{ item.price.toLocaleString() }}
                  </td>
                  <td class="text-center">
                    <div class="d-flex align-items-center justify-content-center gap-1">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        style="padding: 0 6px; font-size: 0.75rem"
                        @click="updateCartQty(idx, -1)"
                      >
                        −
                      </button>
                      <span class="fw-bold" style="min-width: 24px; text-align: center">{{
                        item.quantity
                      }}</span>
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        style="padding: 0 6px; font-size: 0.75rem"
                        @click="updateCartQty(idx, 1)"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td class="text-end fw-bold" style="font-size: 0.85rem; color: var(--brand-teal)">
                    NT$ {{ (item.price * item.quantity).toLocaleString() }}
                  </td>
                  <td class="text-center">
                    <button
                      class="btn btn-sm text-danger"
                      style="padding: 0 4px"
                      @click="removeFromCart(idx)"
                    >
                      <i class="bi bi-x-lg" style="font-size: 0.7rem"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="cart.length > 0">
                <tr style="border-top: 2px solid #e2e8f0">
                  <td colspan="3" class="text-end fw-bold" style="font-size: 0.9rem">訂單合計</td>
                  <td class="text-end fw-bold" style="font-size: 1.1rem; color: var(--brand-teal)">
                    NT$ {{ cartTotal.toLocaleString() }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div class="modal-footer-custom">
          <button class="btn btn-outline-secondary" @click="showCreateModal = false">取消</button>
          <button
            class="btn btn-brand"
            :disabled="creating || !selectedMember || cart.length === 0"
            @click="handleCreateOrder"
          >
            <span v-if="creating" class="spinner-border spinner-border-sm me-1"></span>
            {{ creating ? '建立中...' : '送出訂單' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ====== 批次狀態變更確認 Dialog（置中） ====== -->
  <div v-if="showBatchStatusConfirm" class="confirm-overlay" @click.self="showBatchStatusConfirm = false">
    <div class="confirm-dialog">
      <div class="confirm-icon-wrap">
        <i class="bi bi-exclamation-triangle-fill confirm-icon"></i>
      </div>
      <p class="confirm-message">{{ batchStatusConfirmMsg }}</p>
      <div class="confirm-actions">
        <button class="confirm-btn-cancel" @click="showBatchStatusConfirm = false">取消</button>
        <button class="confirm-btn-ok" @click="executeBatchStatusChange">確定變更</button>
      </div>
    </div>
  </div>

  <!-- ====== 操作結果通知 Dialog（置中，取代 alert） ====== -->
  <div v-if="showBatchResult" class="confirm-overlay" @click.self="showBatchResult = false">
    <div class="confirm-dialog">
      <div class="confirm-icon-wrap">
        <i class="bi bi-check-circle-fill confirm-icon" style="color: #10b981;"></i>
      </div>
      <p class="confirm-message">{{ batchResultMsg }}</p>
      <div class="confirm-actions">
        <button class="confirm-btn-ok" @click="showBatchResult = false">確認</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 頁面標題（與職員管理統一）===== */
.page-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
}
.page-title i {
  margin-right: 0.4rem;
}

/* ===== 新增按鈕（與職員管理統一）===== */
.btn-add {
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  background: #00B4B4;
  color: white;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-add:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
}

/* 覆寫圓角 — 與 ProductManage 統一 */
.card-rounded {
  border-radius: 0.75rem !important;
}

/* ===== 表格表頭 ===== */
.table thead th {
  background: #1b4767;
  color: white;
  font-family: 'Inter', 'Noto Sans TC', sans-serif;
  font-size: 1.12rem;
  font-weight: 400;
  letter-spacing: 0.05em;
  white-space: nowrap;
  border: none;
}

/* ===== 狀態標籤 ===== */
.badge {
  display: inline-block;
  padding: 0.3rem 0.7rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.badge-active {
  background: #dcfce7;
  color: #16a34a;
}
.badge-unpaid {
  background: #fef3c7;
  color: #d97706;
}
.badge-paid {
  background: #dbeafe;
  color: #2563eb;
}
.badge-shipped {
  background: #ede9fe;
  color: #7c3aed;
}
.badge-cancelled {
  background: #ffe4e6;
  color: #e11d48;
}
.badge-default {
  background: #f1f5f9;
  color: #64748b;
}

/* ===== 表格 ===== */
table th {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid #f1f5f9;
}

table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

/* ===== 訂單列 ===== */
.order-row {
  transition: background 0.2s ease;
}

.order-row:hover {
  background: #f8fafc !important;
}

.order-row.expanded {
  background: #f0f9ff !important;
}

.expand-icon {
  font-size: 0.75rem;
  color: #94a3b8;
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
  background: #f1f5f9;
  color: #475569;
}

/* ===== 狀態 Tabs ===== */
.status-tab {
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
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
  background: #fafbfc;
}

.detail-panel {
  padding: 1rem 1.5rem 1rem 3rem;
  animation: slideDown 0.25s ease;
}

/* ===== 分頁 ===== */
.pagination-custom .page-link {
  border: none;
  color: #64748b;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.5rem 0.85rem;
  border-radius: 0.5rem;
  margin: 0 2px;
  transition: all 0.2s ease;
}

.pagination-custom .page-link:hover {
  background: #f0f9ff;
  color: var(--brand-sky);
}

.pagination-custom .active .page-link {
  background: var(--brand-sky);
  color: white;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
}

.pagination-custom .disabled .page-link {
  color: #cbd5e1;
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
  border-bottom: 1px solid #f1f5f9;
}

.modal-body-custom {
  padding: 1.5rem;
}

.modal-footer-custom {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f1f5f9;
}

/* ===== 動畫 ===== */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }

  to {
    opacity: 1;
    max-height: 500px;
  }
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
  background: #f0f9ff;
  color: var(--brand-sky, #0ea5e9);
  border: 1px solid #bae6fd;
}

.action-btn-status.dropdown-toggle::after {
  display: none;
}

.action-btn-status:hover:not(:disabled) {
  background: var(--brand-sky, #0ea5e9);
  color: white;
  border-color: var(--brand-sky, #0ea5e9);
}

.action-btn-status:disabled {
  background: #f1f5f9;
  color: #cbd5e1;
  border-color: #e2e8f0;
  cursor: not-allowed;
  opacity: 0.6;
}

.action-btn-edit {
  background: #eef2ff;
  color: #6366f1;
  border: 1px solid #c7d2fe;
}

.action-btn-edit:hover {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

.action-btn-delete {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.action-btn-delete:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
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
  border: 1px solid #f1f5f9;
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
  background: #f8fafc;
}

/* ===== 新增訂單 — 會員搜尋 ===== */
.selected-member-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 0.75rem;
}

.member-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e2e8f0;
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
  background: #f0f9ff;
}

/* ===== 新增訂單 — 購物車 ===== */
.cart-table-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}

/* ===== C 版面：左右分割 ===== */
.c-layout {
  display: flex;
  gap: 1rem;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.c-master {
  flex: 1;
  min-width: 0;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.c-layout.has-detail .c-master {
  flex: 0 0 58%;
}

.c-detail {
  flex: 0 0 40%;
  min-width: 0;
}

.c-detail-inner {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
  overflow: hidden;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.c-order-row {
  transition: background 0.15s ease;
}

.c-order-row:hover {
  background: #f0f9ff !important;
}

.c-order-row.c-selected {
  background: #e0f2fe !important;
  border-left: 3px solid var(--brand-sky);
}

.c-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #fafbfc 0%, #f0f9ff 100%);
}

.c-detail-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}

.c-tab-btn {
  flex: 1;
  padding: 0.55rem 0.25rem;
  border: none;
  background: none;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.c-tab-btn:hover {
  color: var(--brand-sky);
}

.c-tab-btn.active {
  color: var(--brand-sky);
  border-bottom-color: var(--brand-sky);
  background: white;
}

.c-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

.c-tab-content {
  animation: fadeIn 0.2s ease;
}

.c-item-row {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.c-item-row:last-child {
  border-bottom: none;
}

.info-card {
  padding: 0.65rem 0.85rem;
  background: #fafbfc;
  border-radius: 0.65rem;
  border: 1px solid #f1f5f9;
}

.info-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.2rem;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--brand-dark);
}

.info-sub {
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 0.1rem;
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

/* 側邊面板滑入動畫 */
.slide-panel-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-panel-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-panel-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-panel-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* 儀表板 Banner */
.dashboard-banner {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.stat-block {
  padding: 1.2rem 1rem;
  border-right: 1px solid #f1f5f9;
  transition: background 0.2s ease;
}

.stat-block:hover {
  background: #f8fafc;
}

.stat-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
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
  background: #e2e8f0;
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
  border: 4px solid #e2e8f0;
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
  color: #94a3b8;
  font-weight: 600;
  transition: color 0.3s ease;
}

.progress-step.active .step-label {
  color: var(--brand-dark);
}

.progress-step.active .step-time {
  color: var(--brand-dark);
}

.step-time {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 0.15rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* 堆疊長條比例圖 */
.status-stacked-bar {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  background-color: #f8fafc;
}

.stacked-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.7rem;
  font-weight: 600;
  transition:
    opacity 0.3s ease,
    filter 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.3);
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
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* ===== 匯出下拉選單 ===== */
.btn-outline-brand {
  background: white;
  border: 1.5px solid var(--brand-sky);
  color: var(--brand-sky);
  border-radius: 0.6rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  transition: all 0.2s;
}

.btn-outline-brand:hover {
  background: var(--brand-sky);
  color: white;
}

.export-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #e2e8f0;
  padding: 0.4rem 0;
  min-width: 200px;
  z-index: 999;
}

.export-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.export-menu-item:hover {
  background: #f1f5f9;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== 表格底部資訊列 ===== */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
  border-radius: 0 0 0.75rem 0.75rem;
}

.table-footer-left {
  font-size: 0.8rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.table-footer-left strong {
  color: var(--brand-dark);
}

.table-footer-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.table-footer-right {
  font-size: 0.8rem;
  color: #64748b;
  flex: 1;
  text-align: right;
}

.table-footer-right strong {
  color: var(--brand-dark);
}

.selected-count {
  color: var(--brand-sky);
  font-weight: 700;
  background: rgba(14, 165, 233, 0.08);
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.78rem;
}

/* ===== Checkbox ===== */
.table-check {
  width: 16px;
  height: 16px;
  cursor: pointer;
  border-radius: 4px;
  border: 1.5px solid #cbd5e1;
  transition: all 0.15s;
}

.table-check:checked {
  background-color: var(--brand-sky);
  border-color: var(--brand-sky);
}

/* ===== 批次操作工具列 ===== */
.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, #1e293b, #334155);
  border-radius: 0.75rem 0.75rem 0 0;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.batch-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.batch-count {
  color: white;
  font-size: 0.82rem;
  font-weight: 600;
}

.batch-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.batch-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  border-radius: 0.5rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.batch-btn-status {
  background: rgba(14, 165, 233, 0.15);
  color: #7dd3fc;
}

.batch-btn-status:hover {
  background: rgba(14, 165, 233, 0.3);
}

.batch-btn-export {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
}

.batch-btn-export:hover {
  background: rgba(16, 185, 129, 0.3);
}

.batch-btn-delete {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.batch-btn-delete:hover {
  background: rgba(239, 68, 68, 0.3);
}

.batch-btn-clear {
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.batch-btn-clear:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* 批次狀態下拉 */
.batch-status-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: white;
  border-radius: 0.6rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  padding: 0.3rem 0;
  min-width: 160px;
  z-index: 999;
}

.batch-status-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.85rem;
  border: none;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: background 0.12s;
}

.batch-status-item:hover {
  background: #f1f5f9;
}

/* 動畫 */
.batch-bar-enter-active {
  transition: all 0.25s ease;
}

.batch-bar-leave-active {
  transition: all 0.15s ease;
}

.batch-bar-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.batch-bar-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ===== 置中確認 / 結果 Dialog ===== */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.15s ease;
}

.confirm-dialog {
  background: white;
  border-radius: 1rem;
  padding: 2.5rem 2rem 1.75rem;
  min-width: 380px;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  text-align: center;
  animation: dialogBounce 0.3s ease-out;
}

@keyframes dialogBounce {
  0% { opacity: 0; transform: scale(0.85) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.confirm-icon-wrap {
  margin-bottom: 1rem;
}

.confirm-icon {
  font-size: 3.2rem;
  color: #f59e0b;
}

.confirm-message {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.confirm-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.confirm-btn-cancel {
  padding: 0.55rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn-cancel:hover {
  background: #e2e8f0;
}

.confirm-btn-ok {
  padding: 0.55rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  background: #f59e0b;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn-ok:hover {
  background: #d97706;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
}
</style>
