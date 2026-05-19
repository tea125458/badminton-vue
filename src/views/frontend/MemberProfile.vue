<script setup>
/**
 * 前台會員個人中心
 * 使用 Vue 前台設計系統：Bootstrap + 品牌色彩
 * - 上方：歡迎區 + 帳號 / 等級概覽
 * - 下方：個人資料表單（姓名、性別不可改）
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { memberApi } from '@/api/member'
import { bookingApi } from '@/api/booking'
import { orderApi } from '@/api/order'

const router = useRouter()
const route = useRoute()

const member = ref(null)
const isLoading = ref(true)
const isSaving = ref(false)
const successMsg = ref('')
const avatarUrl = ref(null)
const isUploadingAvatar = ref(false)
const errorMsg = ref('')

// 自訂提示 Modal
const modalVisible = ref(false)
const modalType = ref('success')   // 'success' | 'error' | 'warning' | 'confirm'
const modalTitle = ref('')
const modalMessage = ref('')
const modalCallback = ref(null)

function showModal(type, title, message, callback = null) {
  modalType.value = type
  modalTitle.value = title
  modalMessage.value = message
  modalCallback.value = callback
  modalVisible.value = true
}

function closeModal(confirmed = false) {
  modalVisible.value = false
  if (confirmed && modalCallback.value) {
    modalCallback.value()
  }
  modalCallback.value = null
}

const form = ref({
  fullName: '',
  gender: '',
  birthday: '',
  phone: '',
  email: '',
})

// 修改密碼相關
const pwdForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const showOldPwd = ref(false)
const showNewPwd = ref(false)
const pwdSuccessMsg = ref('')
const pwdErrorMsg = ref('')
const isChangingPwd = ref(false)

const orders = ref([])
const loadingOrders = ref(false)

// 發票捐贈單位對照表
const getDonationUnit = (code) => {
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
  return unitMap[code] || ''
}

// 狀態對照 (同步 MyOrders.vue)
const statusMap = {
  UNPAID: { label: '訂單成立', color: '#F59E0B', bg: '#FEF3C7', icon: 'bi-clipboard-check' },
  PAID: { label: '備貨中', color: '#3B82F6', bg: '#DBEAFE', icon: 'bi-box-seam' },
  SHIPPED: { label: '待取貨', color: '#8B5CF6', bg: '#EDE9FE', icon: 'bi-shop' },
  COMPLETED: { label: '已取貨', color: '#10B981', bg: '#D1FAE5', icon: 'bi-check2-circle' },
  CANCELLED: { label: '已取消', color: '#F43F5E', bg: '#FFE4E6', icon: 'bi-x-circle' },
}
const paymentMap = {
  CASH: '現金支付',
  CREDIT_CARD: '信用卡',
  TRANSFER: '銀行轉帳',
  LINE_PAY: 'LINE Pay',
}

// 展開與明細相關
const expandedId = ref(null)
const orderItems = ref({}) // { orderId: [items...] }
const loadingItems = ref(null) // 正在載入明細的 orderId

// 進度條邏輯
const progressSteps = ['UNPAID', 'PAID', 'SHIPPED', 'COMPLETED']
function isStepActive(currentStatus, step) {
  if (currentStatus === 'CANCELLED') return false
  return progressSteps.indexOf(step) <= progressSteps.indexOf(currentStatus)
}
function getProgressWidth(currentStatus) {
  if (currentStatus === 'CANCELLED') return '0%'
  const index = progressSteps.indexOf(currentStatus)
  if (index === -1) return '0%'
  return (index / (progressSteps.length - 1)) * 100 + '%'
}
const stepTimeFields = {
  UNPAID: 'createdAt',
  PAID: 'paidAt',
  SHIPPED: 'shippedAt',
  COMPLETED: 'completedAt',
}
function getStepTime(order, step) {
  const field = stepTimeFields[step]
  const val = order[field]
  if (!val) return ''
  const d = new Date(val)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 頁籤切換
const activeTab = ref('profile')
const menuItems = [
  { id: 'profile', label: '會員個人資料', icon: 'bi-person-gear' },
  { id: 'bookings', label: '我的預約紀錄', icon: 'bi-calendar-check' },
  { id: 'orders', label: '歷史消費訂單', icon: 'bi-bag-check' },
]

// 監聽網址頁籤變化
watch(() => route.query.tab, (newTab) => {
  if (newTab) switchTab(newTab)
})

async function fetchOrders() {
  if (!member.value?.memberId) {
    loadingOrders.value = false
    return
  }
  loadingOrders.value = true
  try {
    const data = await orderApi.findByMemberId(member.value.memberId)
    // 確保 data 是陣列，避免 slice 報錯
    orders.value = Array.isArray(data) ? data.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)) : []

    // 預抓所有訂單的明細，以正確顯示圖片與商品件數
    for (let i = 0; i < orders.value.length; i++) {
      const oid = orders.value[i].orderId
      if (!orderItems.value[oid]) {
        orderApi.findItems(oid).then((items) => {
          orderItems.value[oid] = items
        })
      }
    }
  } catch (err) {
    console.error('載入訂單失敗', err)
  } finally {
    loadingOrders.value = false
  }
}

async function toggleExpand(orderId) {
  if (expandedId.value === orderId) {
    expandedId.value = null
    return
  }
  expandedId.value = orderId
  if (!orderItems.value[orderId]) {
    loadingItems.value = orderId
    try {
      orderItems.value[orderId] = await orderApi.findItems(orderId)
    } catch (e) {
      orderItems.value[orderId] = []
    } finally {
      loadingItems.value = null
    }
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

function getInvoiceLabel(order) {
  if (!order.invoiceType) return '未設定'
  if (order.invoiceType === 'INDIVIDUAL') {
    if (order.invoiceCarrier) {
      if (order.invoiceCarrier.startsWith('/')) {
        return `個人電子發票（手機條碼：${order.invoiceCarrier}）`
      } else if (/^[A-Za-z]{2}\d{14}$/.test(order.invoiceCarrier)) {
        return `個人電子發票（自然人憑證：${order.invoiceCarrier}）`
      }
      return `個人電子發票（載具：${order.invoiceCarrier}）`
    }
    return '個人電子發票（現場取貨時隨貨交付）'
  }
  if (order.invoiceType === 'COMPANY') {
    return `公司發票（統編：${order.invoiceTaxId}）`
  }
  if (order.invoiceType === 'DONATION') {
    const unit = getDonationUnit(order.invoiceCarrier)
    return unit ? `捐贈發票 — ${unit}（捐贈碼：${order.invoiceCarrier}）` : `捐贈發票（捐贈碼：${order.invoiceCarrier}）`
  }
  return '未設定'
}

// 電話格式化
function formatPhone() {
  let v = form.value.phone.replace(/\D/g, '')
  if (v.length > 10) v = v.substring(0, 10)
  let f = ''
  if (v.length > 0) f = v.substring(0, 4)
  if (v.length > 4) f += '-' + v.substring(4, 7)
  if (v.length > 7) f += '-' + v.substring(7, 10)
  form.value.phone = f
}

// 載入個人資料
onMounted(async () => {
  const token = localStorage.getItem('memberToken')
  if (!token) {
    router.replace('/login')
    return
  }

  try {
    const data = await memberApi.getProfile()
    member.value = data
    avatarUrl.value = data.profilePicture || null
    form.value = {
      fullName: data.fullName || '',
      gender: data.gender || '',
      birthday: data.birthday || '',
      phone: data.phone || '',
      email: data.email || '',
    }
    
    // 初始頁籤
    if (route.query.tab) {
      switchTab(route.query.tab)
    }
  } catch (err) {
    if (err.response?.status === 401) {
      localStorage.removeItem('memberToken')
      localStorage.removeItem('memberInfo')
      router.replace('/login')
    }
  } finally {
    isLoading.value = false
  }

  // 若 URL 帶有 ?tab=bookings，自動切換到對應頁籤
  const tabParam = route.query.tab
  if (tabParam && menuItems.some(m => m.id === tabParam)) {
    switchTab(tabParam)
  }
})

// 儲存變更
async function handleSave() {
  successMsg.value = ''
  errorMsg.value = ''

  const d = form.value
  if (!d.phone || !d.email) {
    errorMsg.value = '電話和 Email 為必填'
    return
  }
  const phoneDigits = d.phone.replace(/\D/g, '')
  if (phoneDigits.length !== 10 || !phoneDigits.startsWith('09')) {
    errorMsg.value = '電話格式錯誤！必須為 09 開頭的 10 位數字'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errorMsg.value = 'Email 格式錯誤！'
    return
  }

  isSaving.value = true
  try {
    await memberApi.updateProfile(d)
    successMsg.value = '個人資料已更新成功！'
    // 同步 localStorage
    const info = JSON.parse(localStorage.getItem('memberInfo') || '{}')
    Object.assign(info, d)
    localStorage.setItem('memberInfo', JSON.stringify(info))
  } catch (err) {
    errorMsg.value = '更新失敗，請檢查輸入內容'
  } finally {
    isSaving.value = false
  }
}

// 執行修改密碼
async function handleChangePassword() {
  pwdSuccessMsg.value = ''
  pwdErrorMsg.value = ''

  const { oldPassword, newPassword, confirmPassword } = pwdForm.value
  if (!oldPassword || !newPassword || !confirmPassword) {
    pwdErrorMsg.value = '請填寫所有密碼欄位'
    return
  }
  if (newPassword !== confirmPassword) {
    pwdErrorMsg.value = '兩次輸入的新密碼不一致'
    return
  }
  if (newPassword.length < 6 || newPassword.length > 15) {
    pwdErrorMsg.value = '新密碼長度必須為 6-15 碼'
    return
  }

  isChangingPwd.value = true
  try {
    await memberApi.changePassword(oldPassword, newPassword)
    pwdSuccessMsg.value = '密碼已修改成功！'
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    pwdErrorMsg.value = err.response?.data || '修改失敗，請檢查舊密碼是否正確'
  } finally {
    isChangingPwd.value = false
  }
}

// 登出
function handleLogout() {
  localStorage.removeItem('memberToken')
  localStorage.removeItem('memberInfo')
  router.push('/login')
}

function getLevelBadge(level) {
  return level === 'VIP'
    ? { label: 'VIP 會員', cls: 'badge-vip' }
    : { label: '一般會員', cls: 'badge-normal' }
}

// ========== 預約紀錄 ==========
const bookings = ref([])
const bookingFilter = ref('all') // 'all', 'upcoming', 'completed', 'cancelled'
const bookingsLoading = ref(false)

const filteredBookings = computed(() => {
  const today = new Date().toISOString().split('T')[0] // yyyy-MM-dd
  return bookings.value.filter((b) => {
    if (bookingFilter.value === 'upcoming') {
      return b.bookingDate >= today && (b.status === 'CONFIRMED' || b.status === 'PENDING')
    }
    if (bookingFilter.value === 'completed') {
      return b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && b.bookingDate < today)
    }
    if (bookingFilter.value === 'cancelled') {
      return b.status === 'CANCELLED'
    }
    return true // 'all'
  })
})

// 載入預約紀錄
async function loadBookings() {
  bookingsLoading.value = true
  try {
    const data = await bookingApi.getMyAllBookings()
    console.log('預約紀錄 API 回傳:', data)
    bookings.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('載入預約紀錄失敗:', err)
    console.error('錯誤回應:', err.response?.status, err.response?.data)
  } finally {
    bookingsLoading.value = false
  }
}

// 切換到預約紀錄頁籤時載入
function switchTab(tabId) {
  activeTab.value = tabId
  
  // 核心修復：在切換頁籤時，同步更新 URL query 參數，確保「上一頁」能正確返回該頁籤
  router.replace({ query: { ...route.query, tab: tabId } })

  if (tabId === 'bookings') {
    loadBookings()
  }
  if (tabId === 'orders' && orders.value.length === 0) {
    fetchOrders()
  }
}

// 狀態顯示輔助
function getStatusInfo(booking) {
  const today = new Date().toISOString().split('T')[0]
  if (booking.status === 'PENDING')
    return { label: '待付款', cls: 'status-pending', icon: 'bi-hourglass-split' }
  if (booking.status === 'CANCELLED')
    return { label: '已取消', cls: 'status-cancelled', icon: 'bi-x-circle' }
  if (
    booking.status === 'COMPLETED' ||
    (booking.status === 'CONFIRMED' && booking.bookingDate < today)
  ) {
    return { label: '已完成', cls: 'status-completed', icon: 'bi-check-circle' }
  }
  return { label: '即將到來', cls: 'status-upcoming', icon: 'bi-clock' }
}

// 取消預約
async function cancelBooking(booking) {
  showModal('confirm', '確認取消', `確定要取消 ${booking.bookingDate} ${booking.startTime}~${booking.endTime} 的預約嗎？`, async () => {
    try {
      await bookingApi.cancelBooking(booking.bookingId)
      showModal('success', '已取消', '預約已成功取消！')
      loadBookings()
    } catch (err) {
      showModal('error', '取消失敗', err.response?.data?.message || err.response?.data || err.message)
    }
  })
}

// 再次預約
function rebookVenue(booking) {
  router.push('/booking')
}

// 場館圖片
function getVenueImage(booking) {
  const imageUrl = booking.court?.venue?.imageUrl
  if (imageUrl) return 'http://localhost:8080' + imageUrl
  return 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400'
}

// 點擊頭像觸發檔案選擇
function triggerAvatarUpload() {
  document.getElementById('avatarFileInput').click()
}

// 上傳頭像
async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // 檢查檔案類型
  if (!file.type.startsWith('image/')) {
    alert('請選擇圖片檔案（JPG、PNG 等）')
    return
  }
  // 檢查檔案大小（最大 2MB）
  if (file.size > 2 * 1024 * 1024) {
    alert('圖片大小不能超過 2MB')
    return
  }

  isUploadingAvatar.value = true
  try {
    const res = await memberApi.uploadAvatar(file)
    avatarUrl.value = res.imageUrl
    // 同步更新 localStorage 中的會員資料
    const info = JSON.parse(localStorage.getItem('memberInfo') || '{}')
    info.profilePicture = res.imageUrl
    localStorage.setItem('memberInfo', JSON.stringify(info))
    successMsg.value = '頭像更新成功！'
    setTimeout(() => (successMsg.value = ''), 3000)
  } catch (err) {
    alert('頭像上傳失敗，請重試')
  } finally {
    isUploadingAvatar.value = false
    event.target.value = '' // 清空 input 讓同一張圖也能重選
  }
}
</script>

<template>
  <div class="profile-page py-3">
    <div class="container-fluid px-lg-4">
      <div class="row justify-content-center">
        <div class="col-lg-12 col-xl-11">
          <div class="row g-4">
            <!-- 左側選單 -->
            <div class="col-lg-4 col-xl-3">
              <div class="member-sidebar shadow-sm border bg-white p-3">
                <div class="sidebar-user-info text-center py-3 mb-3 border-bottom">
                  <!-- 可點擊上傳的頭像 -->
                  <div
                    class="sidebar-avatar mx-auto mb-2"
                    @click="triggerAvatarUpload"
                    title="點擊更換頭像"
                  >
                    <img
                      v-if="avatarUrl"
                      :src="avatarUrl.startsWith('http') ? avatarUrl : 'http://localhost:8080' + avatarUrl"
                      alt="頭像"
                      class="avatar-img"
                    />
                    <i v-else class="bi bi-person-fill"></i>
                    <div class="avatar-overlay">
                      <i class="bi bi-camera-fill"></i>
                      <span>編輯</span>
                    </div>
                    <div v-if="isUploadingAvatar" class="avatar-loading">
                      <div class="spinner-border spinner-border-sm text-white" role="status"></div>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="avatarFileInput"
                    accept="image/*"
                    style="display: none"
                    @change="handleAvatarUpload"
                  />
                  <h6 class="fw-bold mb-1 text-dark">{{ member?.fullName || member?.username }}</h6>
                  <span class="badge" :class="getLevelBadge(member?.membershipLevel).cls">
                    {{ getLevelBadge(member?.membershipLevel).label }}
                  </span>
                </div>
                <div class="list-group list-group-flush border-0">
                  <button
                    v-for="item in menuItems"
                    :key="item.id"
                    class="list-group-item list-group-item-action sidebar-item mb-2"
                    :class="{ active: activeTab === item.id }"
                    @click="switchTab(item.id)"
                  >
                    <i class="bi me-3" :class="item.icon"></i>
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 右側內容 -->
            <div class="col-lg-8 col-xl-9">
              <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-info" role="status"></div>
                <p class="text-muted mt-2 small">資料載入中...</p>
              </div>

              <template v-else-if="member">
                <!-- 頁籤 1: 個人資料 -->
                <div v-if="activeTab === 'profile'" class="tab-content-fade">
                  <!-- 1. 個人資料卡片 -->
                  <div class="profile-card-base shadow-sm border p-4 bg-white">
                    <h6 class="section-title-bar mb-4">基本資料</h6>
                    <div class="row g-3 mb-4">
                      <div class="col-md-6">
                        <label class="form-label-gray">姓名</label>
                        <input
                          v-model="form.fullName"
                          type="text"
                          class="form-control-styled"
                          disabled
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label-gray">帳號</label>
                        <input
                          :value="member.username"
                          type="text"
                          class="form-control-styled"
                          disabled
                        />
                      </div>
                    </div>

                    <!-- 第二排：生日與性別 (皆設為反灰) -->
                    <div class="row g-3 mb-4">
                      <div class="col-md-6">
                        <label class="form-label-gray">生日</label>
                        <input
                          v-model="form.birthday"
                          type="date"
                          class="form-control-styled"
                          disabled
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label-gray">性別</label>
                        <div class="d-flex gap-4 pt-2">
                          <label class="radio-label">
                            <input v-model="form.gender" type="radio" value="男" disabled /> 男
                          </label>
                          <label class="radio-label">
                            <input v-model="form.gender" type="radio" value="女" disabled /> 女
                          </label>
                        </div>
                      </div>
                    </div>

                    <!-- 第三排：手機與信箱 (可修改) -->
                    <div class="row g-3 mb-4">
                      <div class="col-md-6">
                        <label class="form-label-gray">手機號碼</label>
                        <input
                          v-model="form.phone"
                          type="text"
                          class="form-control-styled"
                          placeholder="09xx-xxx-xxx"
                          maxlength="12"
                          @input="formatPhone"
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label-gray">電子信箱</label>
                        <input v-model="form.email" type="email" class="form-control-styled" />
                      </div>
                    </div>

                    <div
                      v-if="successMsg"
                      class="alert alert-success border-0 py-2 mb-3 small text-center"
                    >
                      <i class="bi bi-check-circle-fill me-1"></i> {{ successMsg }}
                    </div>
                    <div
                      v-if="errorMsg"
                      class="alert alert-danger border-0 py-2 mb-3 small text-center"
                    >
                      <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ errorMsg }}
                    </div>

                    <div class="d-flex justify-content-end mt-4 pt-3 border-top">
                      <button
                        type="submit"
                        class="btn-save-styled"
                        @click="handleSave"
                        :disabled="isSaving"
                      >
                        <span v-if="isSaving" class="spinner-border spinner-border-sm me-2"></span>
                        儲存變更
                      </button>
                    </div>
                  </div>

                  <!-- 2. 安全設定卡片 -->
                  <div class="profile-card-base shadow-sm border p-4 bg-white mt-4">
                    <h6 class="section-title-bar mb-4">修改密碼</h6>
                    <div class="row g-3 mb-3">
                      <div class="col-md-12">
                        <label class="form-label-gray">目前密碼</label>
                        <div class="position-relative">
                          <input
                            v-model="pwdForm.oldPassword"
                            :type="showOldPwd ? 'text' : 'password'"
                            class="form-control-styled"
                            placeholder="請輸入原有的密碼"
                          />
                          <button
                            type="button"
                            class="btn-pwd-toggle"
                            @click="showOldPwd = !showOldPwd"
                          >
                            <i :class="showOldPwd ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="row g-3 mb-3">
                      <div class="col-md-6">
                        <label class="form-label-gray">新密碼</label>
                        <div class="position-relative">
                          <input
                            v-model="pwdForm.newPassword"
                            :type="showNewPwd ? 'text' : 'password'"
                            class="form-control-styled"
                            placeholder="6-15 碼英數字"
                            maxlength="15"
                          />
                          <button
                            type="button"
                            class="btn-pwd-toggle"
                            @click="showNewPwd = !showNewPwd"
                          >
                            <i :class="showNewPwd ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                          </button>
                        </div>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label-gray">確認新密碼</label>
                        <input
                          v-model="pwdForm.confirmPassword"
                          type="password"
                          class="form-control-styled"
                          placeholder="請再次輸入新密碼"
                        />
                      </div>
                    </div>

                    <div
                      v-if="pwdSuccessMsg"
                      class="alert alert-success border-0 py-2 mb-3 small text-center"
                    >
                      <i class="bi bi-shield-check me-1"></i> {{ pwdSuccessMsg }}
                    </div>
                    <div
                      v-if="pwdErrorMsg"
                      class="alert alert-danger border-0 py-2 mb-3 small text-center"
                    >
                      <i class="bi bi-shield-exclamation me-1"></i> {{ pwdErrorMsg }}
                    </div>

                    <div class="d-flex justify-content-end mt-4 pt-3 border-top">
                      <button
                        type="button"
                        class="btn-pwd-save"
                        @click="handleChangePassword"
                        :disabled="isChangingPwd"
                      >
                        <span
                          v-if="isChangingPwd"
                          class="spinner-border spinner-border-sm me-2"
                        ></span>
                        確認變更
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 頁籤 2: 預約紀錄 -->
                <div v-if="activeTab === 'bookings'" class="tab-content-fade">
                  <!-- 篩選 Tab -->
                  <div class="d-flex gap-2 mb-4 flex-wrap">
                    <button
                      v-for="f in [
                        { id: 'all', label: '全部' },
                        { id: 'upcoming', label: '即將到來' },
                        { id: 'completed', label: '已完成' },
                        { id: 'cancelled', label: '已取消' },
                      ]"
                      :key="f.id"
                      class="btn btn-sm rounded-pill px-3"
                      :class="bookingFilter === f.id ? 'btn-brand' : 'btn-outline-secondary'"
                      @click="bookingFilter = f.id"
                      style="font-size: 0.95rem"
                    >
                      {{ f.label }}
                    </button>
                  </div>

                  <!-- 載入中 -->
                  <div v-if="bookingsLoading" class="text-center py-5">
                    <div class="spinner-border text-info" role="status"></div>
                    <p class="text-muted mt-2">載入預約紀錄中...</p>
                  </div>

                  <!-- 預約卡片列表 -->
                  <template v-else-if="filteredBookings.length > 0">
                    <div
                      v-for="booking in filteredBookings"
                      :key="booking.bookingId"
                      class="booking-card mb-3"
                      :class="getStatusInfo(booking).cls"
                    >
                      <div class="row g-0 align-items-center">
                        <!-- 左側：場館圖片 -->
                        <div class="col-auto d-none d-md-block">
                          <div class="booking-img-wrap">
                            <img
                              :src="getVenueImage(booking)"
                              :alt="booking.court?.venue?.venueName"
                            />
                          </div>
                        </div>

                        <!-- 中間：預約資訊 -->
                        <div class="col">
                          <div class="booking-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 class="fw-bold mb-1" style="font-size: 1.1rem">
                                  {{ booking.court?.venue?.venueName || '場館' }}
                                </h6>
                                <span class="text-secondary" style="font-size: 0.9rem">
                                  {{ booking.court?.courtName }}
                                </span>
                              </div>
                              <span
                                class="badge booking-status-badge"
                                :class="getStatusInfo(booking).cls"
                              >
                                <i class="bi me-1" :class="getStatusInfo(booking).icon"></i>
                                {{ getStatusInfo(booking).label }}
                              </span>
                            </div>

                            <div class="booking-meta d-flex flex-wrap gap-3 mb-2">
                              <span
                                ><i class="bi bi-calendar3 me-1"></i>{{ booking.bookingDate }}</span
                              >
                              <span
                                ><i class="bi bi-clock me-1"></i>{{ booking.startTime }} ~
                                {{ booking.endTime }}</span
                              >
                              <span class="fw-semibold" style="color: var(--brand-teal-dark)">
                                <i class="bi bi-cash-stack me-1"></i>NT$ {{ booking.totalAmount }}
                              </span>
                            </div>

                            <!-- 操作按鈕 -->
                            <div class="d-flex gap-2 mt-2">
                              <button
                                v-if="getStatusInfo(booking).label === '即將到來'"
                                class="btn btn-sm btn-outline-danger rounded-pill px-3"
                                @click="cancelBooking(booking)"
                              >
                                <i class="bi bi-x-circle me-1"></i>取消預約
                              </button>
                              <button
                                v-if="getStatusInfo(booking).label === '已完成'"
                                class="btn btn-sm btn-outline-primary rounded-pill px-3"
                                @click="rebookVenue(booking)"
                              >
                                <i class="bi bi-arrow-repeat me-1"></i>再次預約
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- 空狀態 -->
                  <div v-else class="profile-card-base shadow-sm border p-5 bg-white text-center">
                    <div class="empty-state py-4">
                      <i
                        class="bi bi-calendar-x mb-3 d-block"
                        style="font-size: 4rem; color: #e2e8f0"
                      ></i>
                      <h5 class="fw-bold">尚無預約紀錄</h5>
                      <p class="text-muted">歡迎預約打羽球！</p>
                      <RouterLink
                        to="/booking"
                        class="btn-save-styled d-inline-block mt-3"
                        style="text-decoration: none"
                      >
                        前往預約
                      </RouterLink>
                    </div>
                  </div>
                </div>

                <!-- 頁籤 3: 訂單紀錄 -->
                <div v-if="activeTab === 'orders'" class="tab-content-fade">
                  <div class="profile-card-base shadow-sm border bg-white p-4">
                    <h6 class="section-title-bar mb-4">歷史消費訂單</h6>

                     <div v-if="loadingOrders" class="skeleton-order-list">
                       <div v-for="i in 3" :key="i" class="skeleton-order-card mb-4 p-4 rounded-4" style="border: 1px solid #e2e8f0; border-radius: 1rem;">
                         <div class="d-flex justify-content-between align-items-center mb-3">
                           <div class="skeleton-block" style="width: 140px; height: 24px;"></div>
                           <div class="skeleton-block" style="width: 80px; height: 20px; border-radius: 10px;"></div>
                         </div>
                         <div class="d-flex justify-content-between align-items-center">
                           <div class="skeleton-block" style="width: 200px; height: 16px;"></div>
                           <div class="skeleton-block" style="width: 100px; height: 24px;"></div>
                         </div>
                       </div>
                     </div>

                    <div v-else-if="orders.length === 0" class="empty-state py-5 text-center">
                      <i class="bi bi-cart-x mb-3 d-block text-light" style="font-size: 4rem"></i>
                      <h5 class="fw-bold">尚無訂單紀錄</h5>
                      <p class="text-muted">尚無購買紀錄，快去逛逛吧！</p>
                      <RouterLink
                        to="/products"
                        class="btn-save-styled d-inline-block mt-3"
                        style="text-decoration: none"
                      >
                        前往商城
                      </RouterLink>
                    </div>

                    <div v-else class="order-list">
                      <!-- 最新一筆訂單高亮 -->
                      <div v-if="orders.length > 0" class="latest-order-card p-4 rounded-4 mb-4 cursor-pointer" style="background: linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%); border: 2px solid #5EEAD4; transition: all 0.3s;" @click="toggleExpand(orders[0].orderId)">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <div class="small fw-bold mb-1" style="color: #0D9488;"><i class="bi bi-stars me-1"></i>最新一筆訂單</div>
                            <h4 class="fw-800 mb-0">#{{ orders[0].orderId }}</h4>
                          </div>
                          <span class="badge rounded-pill px-3 py-2" :style="{ backgroundColor: statusMap[orders[0].status]?.bg, color: statusMap[orders[0].status]?.color }">
                            {{ statusMap[orders[0].status]?.label }}
                          </span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                          <div class="d-flex align-items-center gap-4">
                            <div class="fw-bold" style="font-size: 1.25rem; color: #0D9488;">NT$ {{ orders[0].totalAmount.toLocaleString() }}</div>
                            <router-link :to="'/my-orders?orderId=' + orders[0].orderId" class="btn btn-sm rounded-pill px-3 shadow-sm" style="background: #0D9488; color: white; border: none; font-size: 0.85rem;" @click.stop>我的訂單</router-link>
                          </div>
                          <i class="bi fs-5" style="color: #0D9488;" :class="expandedId === orders[0].orderId ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                        </div>

                        <!-- 展開內容：明細與進度條 -->
                        <div
                          v-if="expandedId === orders[0].orderId"
                          class="order-expanded-content mt-3 pt-3 border-top animate__animated animate__fadeIn"
                          style="border-color: rgba(94, 234, 212, 0.3) !important;"
                        >
                          <!-- 進度條 (Mini 版) -->
                          <div class="progress-tracker-mini mb-4">
                            <div class="progress-lines-wrap">
                              <div class="progress-line-bg"></div>
                              <div
                                class="progress-line-fill"
                                :style="{
                                  width: getProgressWidth(orders[0].status),
                                  backgroundColor: 'var(--brand-sky)',
                                }"
                              ></div>
                            </div>
                            <div
                              v-for="step in progressSteps"
                              :key="step"
                              class="progress-step-mini"
                              :class="{
                                active: isStepActive(orders[0].status, step),
                                current: orders[0].status === step && step !== 'COMPLETED',
                              }"
                            >
                              <div
                                class="step-dot"
                                :style="
                                  isStepActive(orders[0].status, step)
                                    ? {
                                        borderColor: 'var(--brand-sky)',
                                        backgroundColor:
                                          orders[0].status === step && step !== 'COMPLETED'
                                            ? 'white'
                                            : 'var(--brand-sky)',
                                      }
                                    : {}
                                "
                              >
                                <!-- 如果是當前狀態：秀出專屬圖示 -->
                                <i
                                  v-if="orders[0].status === step && step !== 'COMPLETED'"
                                  :class="['bi', statusMap[step]?.icon]"
                                  :style="{ color: 'var(--brand-sky)', fontSize: '0.85rem' }"
                                ></i>
                                <!-- 如果是已完成狀態：秀出打勾 -->
                                <i
                                  v-else-if="isStepActive(orders[0].status, step)"
                                  class="bi bi-check-lg"
                                  style="color: white; font-size: 1rem"
                                ></i>
                              </div>
                              <div class="step-text">{{ statusMap[step].label }}</div>
                              <div class="step-time">{{ getStepTime(orders[0], step) }}</div>
                            </div>
                          </div>

                          <!-- 訂單資訊卡（同步後台資訊） -->
                          <div class="order-info-card mb-3">
                            <div class="order-info-grid">
                              <div class="order-info-item">
                                <div class="order-info-label"><i class="bi bi-calendar3 me-1"></i>訂購日期</div>
                                <div class="order-info-value">{{ formatDateTime(orders[0].orderDate) }}</div>
                              </div>
                              <div class="order-info-item">
                                <div class="order-info-label"><i class="bi bi-credit-card me-1"></i>付款方式</div>
                                <div class="order-info-value">
                                  <span class="payment-badge">{{ paymentMap[orders[0].paymentType] || '未設定' }}</span>
                                </div>
                              </div>
                              <div class="order-info-item">
                                <div class="order-info-label"><i class="bi bi-geo-alt me-1"></i>取貨方式</div>
                                <div class="order-info-value">球館自取</div>
                                <div class="order-info-sub">羽過天晴羽球館</div>
                              </div>
                              <div class="order-info-item">
                                <div class="order-info-label"><i class="bi bi-receipt me-1"></i>電子發票</div>
                                <div class="order-info-value" style="font-size: 0.8rem; line-height: 1.4;">{{ getInvoiceLabel(orders[0]) }}</div>
                                <div class="order-info-sub fw-bold" style="color: var(--brand-teal); margin-top: 0.15rem; font-size: 0.75rem;">發票號碼：XY-{{ String(orders[0].orderId || '').padStart(8, '0') }}</div>
                              </div>
                            </div>
                          </div>

                          <!-- 商品明细 -->
                          <div v-if="loadingItems === orders[0].orderId" class="skeleton-items-grid px-1 py-2">
                            <div class="order-items-grid">
                              <div v-for="j in 1" :key="j" class="order-item-card d-flex align-items-center gap-3 p-2 border rounded-3 mb-2" style="border: 1px solid #f1f5f9; border-radius: 0.5rem;">
                                <div class="item-img-wrap skeleton-img" style="width: 60px; height: 60px; border-radius: 0.5rem; flex-shrink: 0;"></div>
                                <div class="item-details gap-2 flex-grow-1">
                                  <div class="skeleton-block" style="width: 80%; height: 16px;"></div>
                                  <div class="skeleton-block" style="width: 40%; height: 12px;"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div v-else class="expanded-items-list px-1">
                            <div class="order-items-grid">
                              <div
                                v-for="item in orderItems[orders[0].orderId]"
                                :key="item.itemId"
                                class="order-item-card"
                              >
                                <div class="item-img-wrap">
                                  <img
                                    :src="
                                      item.product?.imageUrl?.startsWith('/')
                                        ? item.product.imageUrl
                                        : '/' + item.product.imageUrl
                                    "
                                    alt="product"
                                  />
                                </div>
                                <div class="item-details">
                                  <div class="item-name" :title="item.product?.productName">
                                    {{ item.product?.productName }}
                                  </div>
                                  <div class="item-meta">
                                    <span class="item-price">NT$ {{ item.unitPrice.toLocaleString() }}</span>
                                    <span class="item-qty">x {{ item.quantity }}</span>
                                  </div>
                                  <div class="item-subtotal">
                                    NT$ {{ (item.unitPrice * item.quantity).toLocaleString() }}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>


                        </div>
                      </div>

                      <h6 v-if="orders.length > 1" class="text-secondary small fw-bold mb-3">更早之前的訂單</h6>

                      <div
                        v-for="order in orders.slice(1)"
                        :key="order.orderId"
                        class="order-item-row p-3 mb-3 border rounded-3"
                        :class="{ 'is-expanded': expandedId === order.orderId }"
                      >
                        <div
                          class="row align-items-center cursor-pointer"
                          @click="toggleExpand(order.orderId)"
                        >
                          <!-- 商品代表圖 -->
                          <div class="col-auto">
                            <div class="order-repr-img-wrap">
                              <img
                                v-if="
                                  orderItems[order.orderId] &&
                                  orderItems[order.orderId][0]?.product?.imageUrl
                                "
                                :src="
                                  orderItems[order.orderId][0].product.imageUrl.startsWith('/')
                                    ? orderItems[order.orderId][0].product.imageUrl
                                    : '/' + orderItems[order.orderId][0].product.imageUrl
                                "
                                class="order-repr-img"
                              />
                              <div
                                v-else-if="loadingItems === order.orderId"
                                class="order-repr-placeholder"
                              >
                                <div class="spinner-border spinner-border-sm text-light"></div>
                              </div>
                              <div v-else class="order-repr-placeholder">
                                <i class="bi bi-box-seam"></i>
                              </div>
                            </div>
                          </div>
                          <!-- 訂單資訊 -->
                          <div class="col">
                            <div class="d-flex justify-content-between align-items-start">
                              <div>
                                <div class="order-id-text">訂單編號 #{{ order.orderId }}</div>
                                <div class="order-date-text text-muted small">
                                  {{ formatDate(order.orderDate) }}
                                </div>
                              </div>
                              <span
                                class="badge"
                                :style="{
                                  backgroundColor: statusMap[order.status]?.bg,
                                  color: statusMap[order.status]?.color,
                                }"
                              >
                                {{ statusMap[order.status]?.label }}
                              </span>
                            </div>
                            <div class="mt-2 d-flex justify-content-between align-items-end">
                              <div class="order-summary-text text-secondary small">
                                共 {{ orderItems[order.orderId]?.length || '...' }} 項商品，共 {{ orderItems[order.orderId]?.reduce((sum, item) => sum + item.quantity, 0) || '...' }} 件 ·
                                {{ paymentMap[order.paymentType] }}
                              </div>
                              <div
                                class="order-amount-text fw-bold"
                                style="color: var(--brand-dark)"
                              >
                                NT$ {{ order.totalAmount.toLocaleString() }}
                              </div>
                            </div>
                          </div>
                          <!-- 展開箭頭 -->
                          <div class="col-auto">
                            <i
                              class="bi fs-5 text-secondary"
                              :class="
                                expandedId === order.orderId ? 'bi-chevron-up' : 'bi-chevron-down'
                              "
                            ></i>
                          </div>
                        </div>

                        <!-- 展開內容：明細與進度條 -->
                        <div
                          v-if="expandedId === order.orderId"
                          class="order-expanded-content mt-3 pt-3 border-top"
                        >
                          <!-- 進度條 (Mini 版) -->
                          <div class="progress-tracker-mini mb-4">
                            <div class="progress-lines-wrap">
                              <div class="progress-line-bg"></div>
                              <div
                                class="progress-line-fill"
                                :style="{
                                  width: getProgressWidth(order.status),
                                  backgroundColor: 'var(--brand-sky)',
                                }"
                              ></div>
                            </div>
                            <div
                              v-for="step in progressSteps"
                              :key="step"
                              class="progress-step-mini"
                              :class="{
                                active: isStepActive(order.status, step),
                                current: order.status === step && step !== 'COMPLETED',
                              }"
                            >
                              <div
                                class="step-dot"
                                :style="
                                  isStepActive(order.status, step)
                                    ? {
                                        borderColor: 'var(--brand-sky)',
                                        backgroundColor:
                                          order.status === step && step !== 'COMPLETED'
                                            ? 'white'
                                            : 'var(--brand-sky)',
                                      }
                                    : {}
                                "
                              >
                                <!-- 如果是當前狀態：秀出專屬圖示 -->
                                <i
                                  v-if="order.status === step && step !== 'COMPLETED'"
                                  :class="['bi', statusMap[step]?.icon]"
                                  :style="{ color: 'var(--brand-sky)', fontSize: '0.85rem' }"
                                ></i>
                                <!-- 如果是已完成狀態：秀出打勾 -->
                                <i
                                  v-else-if="isStepActive(order.status, step)"
                                  class="bi bi-check-lg"
                                  style="color: white; font-size: 1rem"
                                ></i>
                              </div>
                              <div class="step-text">{{ statusMap[step].label }}</div>
                              <div class="step-time">{{ getStepTime(order, step) }}</div>
                            </div>
                          </div>

                          <!-- 訂單資訊卡（同步後台資訊） -->
                          <div class="order-info-card mb-3">
                            <div class="order-info-grid">
                              <div class="order-info-item">
                                <div class="order-info-label"><i class="bi bi-calendar3 me-1"></i>訂購日期</div>
                                <div class="order-info-value">{{ formatDateTime(order.orderDate) }}</div>
                              </div>
                              <div class="order-info-item">
                                <div class="order-info-label"><i class="bi bi-credit-card me-1"></i>付款方式</div>
                                <div class="order-info-value">
                                  <span class="payment-badge">{{ paymentMap[order.paymentType] || '未設定' }}</span>
                                </div>
                              </div>
                              <div class="order-info-item">
                                <div class="order-info-label"><i class="bi bi-geo-alt me-1"></i>取貨方式</div>
                                <div class="order-info-value">球館自取</div>
                                <div class="order-info-sub">羽過天晴羽球館</div>
                              </div>
                              <div class="order-info-item">
                                <div class="order-info-label"><i class="bi bi-receipt me-1"></i>電子發票</div>
                                <div class="order-info-value" style="font-size: 0.8rem; line-height: 1.4;">{{ getInvoiceLabel(order) }}</div>
                                <div class="order-info-sub fw-bold" style="color: var(--brand-teal); margin-top: 0.15rem; font-size: 0.75rem;">發票號碼：XY-{{ String(order.orderId || '').padStart(8, '0') }}</div>
                              </div>
                            </div>
                          </div>

                          <!-- 商品明细 -->
                          <div v-if="loadingItems === order.orderId" class="skeleton-items-grid px-1 py-2">
                            <div class="order-items-grid">
                              <div v-for="j in 1" :key="j" class="order-item-card d-flex align-items-center gap-3 p-2 border rounded-3 mb-2" style="border: 1px solid #f1f5f9; border-radius: 0.5rem;">
                                <div class="item-img-wrap skeleton-img" style="width: 60px; height: 60px; border-radius: 0.5rem; flex-shrink: 0;"></div>
                                <div class="item-details gap-2 flex-grow-1">
                                  <div class="skeleton-block" style="width: 80%; height: 16px;"></div>
                                  <div class="skeleton-block" style="width: 40%; height: 12px;"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div v-else class="expanded-items-list px-1">
                            <div class="order-items-grid">
                              <div
                                v-for="item in orderItems[order.orderId]"
                                :key="item.itemId"
                                class="order-item-card"
                              >
                                <div class="item-img-wrap">
                                  <img
                                    :src="
                                      item.product?.imageUrl?.startsWith('/')
                                        ? item.product.imageUrl
                                        : '/' + item.product.imageUrl
                                    "
                                    alt="product"
                                  />
                                </div>
                                <div class="item-details">
                                  <div class="item-name" :title="item.product?.productName">
                                    {{ item.product?.productName }}
                                  </div>
                                  <div class="item-meta">
                                    <span class="item-price">NT$ {{ item.unitPrice.toLocaleString() }}</span>
                                    <span class="item-qty">x {{ item.quantity }}</span>
                                  </div>
                                  <div class="item-subtotal">
                                    NT$ {{ (item.unitPrice * item.quantity).toLocaleString() }}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>


                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- 自訂提示 Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="modalVisible" class="custom-modal-overlay" @click.self="closeModal(false)">
          <div class="custom-modal-card">
            <div class="modal-icon" :class="modalType">
              <i v-if="modalType === 'success'" class="bi bi-check-lg"></i>
              <i v-else-if="modalType === 'error'" class="bi bi-x-lg"></i>
              <i v-else-if="modalType === 'confirm'" class="bi bi-question-lg"></i>
              <i v-else class="bi bi-exclamation-lg"></i>
            </div>
            <h4 class="modal-title-custom">{{ modalTitle }}</h4>
            <p class="modal-message">{{ modalMessage }}</p>
            <div v-if="modalType === 'confirm'" class="d-flex gap-3 justify-content-center">
              <button class="btn-modal-cancel" @click="closeModal(false)">再想想</button>
              <button class="btn-modal-confirm confirm" @click="closeModal(true)">確定取消</button>
            </div>
            <button v-else class="btn-modal-confirm" :class="modalType" @click="closeModal(true)">
              {{ modalType === 'success' ? '太棒了' : '我知道了' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  position: relative;
  background-image: url('@/assets/images/login-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.profile-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.4);
  z-index: 0;
}

.profile-page > * {
  position: relative;
  z-index: 1;
}

.profile-card-base {
  border-radius: 1rem;
  background-color: #ffffff !important;
  box-shadow: 0 8px 24px rgba(27, 176, 193, 0.12) !important;
  border: 1px solid rgba(84, 218, 213, 0.2) !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.profile-card-base:hover {
  box-shadow: 0 12px 32px rgba(27, 176, 193, 0.18) !important;
  transform: translateY(-2px);
}

/* 標題圖示藍綠色漸層圓圈 */
.icon-circle-gradient {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #12d9d6, #1c7ed6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.3rem;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(18, 183, 217, 0.2);
}

/* 區塊標題條 */
.section-title-bar {
  display: flex;
  align-items: center;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1bb0c1;
}
.section-title-bar::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 1.1rem;
  background-color: #11afbd;
  margin-right: 10px;
  border-radius: 2px;
}

/* 文字與標籤 */
.form-label-gray {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #495057;
  margin-bottom: 6px;
}
.form-label-gray .desc {
  font-size: 0.75rem;
  color: #adb5bd;
  font-weight: 400;
}

/* 輸入框 */
.form-control-styled {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e8;
  border-radius: 8px;
  background-color: #f8f9fb;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.form-control-styled:focus {
  outline: none;
  border-color: #1d8ad2;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(18, 183, 217, 0.1);
}
.form-control-styled:disabled {
  background-color: #f1f3f5;
  color: #868e96;
}

.radio-label {
  cursor: pointer;
  font-weight: 500;
  color: #495057;
  font-size: 0.9rem;
}

/* 按鈕 */
.btn-save-styled {
  background: linear-gradient(135deg, #14c9c6, #1c9ed6);
  color: white;
  border: none;
  padding: 10px 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.btn-save-styled:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-cancel-styled {
  background: white;
  color: #495057;
  border: 1px solid #dee2e6;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-cancel-styled:hover {
  background: #f8f9fa;
}

/* 修改密碼專用樣式 */
.btn-pwd-save {
  background-color: #94a3b8;
  color: white;
  border: none;
  padding: 10px 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(148, 163, 184, 0.2);
}
.btn-pwd-save:hover:not(:disabled) {
  background-color: #64748b;
  box-shadow: 0 6px 12px rgba(100, 116, 139, 0.3);
}
.btn-pwd-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #adb5bd;
  padding: 0 5px;
  z-index: 10;
}
.section-title-bar .desc {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 400;
}

/* 側邊欄樣式 */
.member-sidebar {
  border-radius: 1rem;
  height: 100%;
  min-height: 600px;
  display: flex;
  flex-direction: column;
  background-color: #ffffff !important;
  box-shadow: 0 8px 24px rgba(27, 176, 193, 0.12) !important;
  border: 1px solid rgba(84, 218, 213, 0.2) !important;
  transition: box-shadow 0.3s ease;
}
.member-sidebar:hover {
  box-shadow: 0 12px 32px rgba(27, 176, 193, 0.18) !important;
}
.sidebar-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #12d9d6, #1c7ed6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}
.sidebar-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.avatar-overlay i {
  font-size: 1.1rem;
}
.sidebar-avatar:hover .avatar-overlay {
  opacity: 1;
}
.avatar-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sidebar-item {
  border: none;
  border-radius: 0.75rem !important;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.8rem 1.2rem;
  color: #495057;
  transition: all 0.2s;
}
.sidebar-item:hover {
  background-color: #f8f9fa;
  color: #1bb0c1;
}
.sidebar-item.active {
  background-color: #f0fdfa;
  color: #11afbd;
  border: none;
}
.sidebar-item.active::after {
  content: '';
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background-color: #11afbd;
  border-radius: 50%;
}

.badge-vip {
  background-color: #fef9c3;
  color: #ca8a04;
  font-weight: 700;
}
.badge-normal {
  background-color: #f1f5f9;
  color: #64748b;
  font-weight: 700;
}

.empty-state i {
  color: #e9ecef;
}

/* 訂單列表樣式 */
.order-item-row {
  transition: all 0.2s;
  border-color: #f1f5f9 !important;
}
.order-item-row:hover {
  border-color: #1bb0c1 !important;
  background-color: #fcfdfe;
}

/* ========== 預約紀錄卡片 ========== */
.booking-card {
  background: white;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.booking-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* 狀態左邊線顏色 */
.booking-card.status-pending {
  border-left-color: #f59e0b;
}
.booking-card.status-upcoming {
  border-left-color: #10b981;
}
.booking-card.status-completed {
  border-left-color: #94a3b8;
}
.booking-card.status-cancelled {
  border-left-color: #ef4444;
}

/* 場館圖片 */
.booking-img-wrap {
  width: 140px;
  height: 120px;
  overflow: hidden;
  border-radius: 0.75rem;
  margin: 1rem;
}
.booking-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.booking-card:hover .booking-img-wrap img {
  transform: scale(1.05);
}

/* 卡片內容 */
.booking-body {
  padding: 1rem 1.25rem;
}

/* 狀態 Badge */
.booking-status-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 2rem;
}
.booking-status-badge.status-pending {
  background-color: #fef3c7;
  color: #d97706;
}
.booking-status-badge.status-upcoming {
  background-color: #ecfdf5;
  color: #059669;
}
.booking-status-badge.status-completed {
  background-color: #f1f5f9;
  color: #64748b;
}
.booking-status-badge.status-cancelled {
  background-color: #fef2f2;
  color: #dc2626;
}

/* 預約資訊元數據 */
.booking-meta {
  font-size: 0.92rem;
  color: #64748b;
}
.booking-meta i {
  color: #94a3b8;
}
.order-repr-img-wrap {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 1.5px solid #f1f5f9;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.order-repr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast; /* 提升縮放後的圖片解析度與銳利度 */
}
.order-repr-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  font-size: 1.5rem;
}
.order-id-text {
  font-weight: 700;
  color: #334155;
  font-size: 0.95rem;
}
.btn-outline-info {
  border-color: #1bb0c1;
  color: #1bb0c1;
}
.btn-outline-info:hover {
  background-color: #1bb0c1;
  color: white;
}
.cursor-pointer {
  cursor: pointer;
}
.border-bottom-dashed {
  border-bottom: 1px dashed #f1f5f9;
}

/* 進度條 (Mini 版) */
.progress-tracker-mini {
  position: relative;
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
}
.progress-lines-wrap {
  position: absolute;
  top: calc(0.5rem + 14px);
  left: calc(1rem + 12.5%);
  right: calc(1rem + 12.5%);
  height: 3px;
  z-index: 0;
}
.progress-line-bg {
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
  transition: width 0.4s ease;
  border-radius: 2px;
}
.progress-step-mini {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25%;
}
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e2e8f0;
  margin-bottom: 0.35rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.progress-step-mini.active .step-dot {
  border-color: var(--brand-sky);
  background: var(--brand-sky);
}
.progress-step-mini.current .step-dot {
  border-color: var(--brand-sky);
  background: white;
}
.step-text {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 600;
}
.progress-step-mini.active .step-text {
  color: var(--brand-dark);
}
.step-time {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.1rem;
}
.progress-step-mini.active .step-time {
  color: var(--brand-dark);
}

/* ===== 訂單資訊卡（同步後台資訊） ===== */
.order-info-card {
  background: #f8fafb;
  border: 1px solid #e8f0f6;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
}

.order-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem 1.5rem;
}

.order-info-item {
  min-width: 0;
}

.order-info-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.2rem;
}

.order-info-label i {
  color: #0D9488;
}

.order-info-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  word-break: break-all;
}

.order-info-sub {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 0.1rem;
}

.payment-badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  background: #e2e8f0;
  border-radius: 6px;
}

@media (max-width: 480px) {
  .order-info-grid {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
}

/* ===== 展開商品卡片式排版 ===== */
.expanded-items-list {
  max-height: 380px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

/* 現代精緻滾動條 */
.expanded-items-list::-webkit-scrollbar {
  width: 4px;
}
.expanded-items-list::-webkit-scrollbar-track {
  background: transparent;
}
.expanded-items-list::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 99px;
}
.expanded-items-list::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

.order-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.order-item-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 0.75rem;
  padding: 0.75rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.order-item-card:hover {
  border-color: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

.item-img-wrap {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 0.5rem;
  border: 1px solid #f1f5f9;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
}

.item-details {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.15rem;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.72rem;
  color: #64748b;
}

.item-price {
  font-weight: 500;
}

.item-qty {
  background: #f1f5f9;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.68rem;
  color: #475569;
}

.item-subtotal {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--brand-dark);
  margin-top: 0.2rem;
  text-align: right;
}

/* ===== 骨架屏載入效果 (Skeleton Loading) ===== */
.skeleton-order-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.skeleton-block {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 6px;
  content: "";
}

.skeleton-img {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>

<style scoped>
/* ===== 自訂提示 Modal ===== */
.custom-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-modal-card {
  background: white;
  border-radius: 1.25rem;
  padding: 2.5rem 2rem 2rem;
  text-align: center;
  width: 90%;
  max-width: 380px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: modalBounceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalBounceIn {
  from { opacity: 0; transform: scale(0.85) translateY(20px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
  font-size: 2rem;
}
.modal-icon.success { background: #ECFDF5; color: #10B981; border: 3px solid #A7F3D0; }
.modal-icon.error   { background: #FEF2F2; color: #EF4444; border: 3px solid #FECACA; }
.modal-icon.warning  { background: #FFFBEB; color: #F59E0B; border: 3px solid #FDE68A; }
.modal-icon.confirm  { background: #FFF7ED; color: #F97316; border: 3px solid #FED7AA; }

.modal-title-custom {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 0.5rem;
}

.modal-message {
  font-size: 0.95rem;
  color: #64748B;
  margin-bottom: 1.75rem;
  line-height: 1.6;
}

.btn-modal-confirm {
  display: inline-block;
  padding: 0.65rem 2.5rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-modal-confirm.success { background: linear-gradient(135deg, #10B981, #34D399); color: white; }
.btn-modal-confirm.error   { background: linear-gradient(135deg, #EF4444, #F87171); color: white; }
.btn-modal-confirm.confirm { background: linear-gradient(135deg, #EF4444, #F87171); color: white; }
.btn-modal-confirm:hover { transform: translateY(-2px); filter: brightness(1.05); }

.btn-modal-cancel {
  display: inline-block;
  padding: 0.65rem 2.5rem;
  border: 1.5px solid #CBD5E1;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 700;
  background: white;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-modal-cancel:hover { background: #F8FAFC; border-color: #94A3B8; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
