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

// 訂單相關
const orders = ref([])
const loadingOrders = ref(false)

// 狀態對照 (同步 MyOrders.vue)
const statusMap = {
  UNPAID: { label: '訂單成立', color: '#F59E0B', bg: '#FEF3C7', icon: 'bi-clipboard-check' },
  PAID: { label: '備貨中', color: '#3B82F6', bg: '#DBEAFE', icon: 'bi-box-seam' },
  SHIPPED: { label: '待取貨', color: '#8B5CF6', bg: '#EDE9FE', icon: 'bi-shop' },
  COMPLETED: { label: '已取貨', color: '#10B981', bg: '#D1FAE5', icon: 'bi-check2-circle' },
  CANCELLED: { label: '已取消', color: '#F43F5E', bg: '#FFE4E6', icon: 'bi-x-circle' },
}
const paymentMap = {
  CASH: '現金',
  CREDIT_CARD: '信用卡',
  TRANSFER: '轉帳',
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
  { id: 'profile', label: '會員帳號資料', icon: 'bi-person-gear' },
  { id: 'bookings', label: '我的預約紀錄', icon: 'bi-calendar-check' },
  { id: 'orders', label: '歷史消費訂單', icon: 'bi-bag-check' },
]

// 監聽頁籤切換，若是訂單頁且還沒抓過資料就抓一次
watch(activeTab, (newTab) => {
  if (newTab === 'orders' && orders.value.length === 0) {
    fetchOrders()
  }
})

async function fetchOrders() {
  if (!member.value?.memberId) return
  loadingOrders.value = true
  try {
    const data = await orderApi.findByMemberId(member.value.memberId)
    orders.value = data.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))

    // 為了顯示代表圖，預抓前 5 筆的明細
    const prefetchCount = Math.min(orders.value.length, 5)
    for (let i = 0; i < prefetchCount; i++) {
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
  if (newPassword.length < 6 || newPassword.length > 12) {
    pwdErrorMsg.value = '新密碼長度必須為 6-12 碼'
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
  if (tabId === 'bookings') {
    loadBookings()
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
  if (
    !confirm(`確定要取消 ${booking.bookingDate} ${booking.startTime}~${booking.endTime} 的預約嗎？`)
  )
    return
  try {
    await bookingApi.cancelBooking(booking.bookingId)
    alert('預約已取消！')
    loadBookings() // 重新載入
  } catch (err) {
    alert('取消失敗：' + (err.response?.data || err.message))
  }
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
                      :src="'http://localhost:8080' + avatarUrl"
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
                            placeholder="6-12 碼英數字"
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

                    <div v-if="loadingOrders" class="text-center py-5">
                      <div class="spinner-border text-info" role="status"></div>
                      <p class="text-muted mt-2 small">訂單載入中...</p>
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
                      <div
                        v-for="order in orders"
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
                                共 {{ orderItems[order.orderId]?.length || '...' }} 項商品 ·
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

                          <!-- 商品明细 -->
                          <div v-if="loadingItems === order.orderId" class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-info"></div>
                          </div>
                          <div v-else class="expanded-items-list px-2">
                            <div
                              v-for="item in orderItems[order.orderId]"
                              :key="item.itemId"
                              class="d-flex align-items-center gap-3 mb-2 py-2 border-bottom-dashed"
                            >
                              <img
                                :src="
                                  item.product?.imageUrl?.startsWith('/')
                                    ? item.product.imageUrl
                                    : '/' + item.product.imageUrl
                                "
                                class="rounded-2"
                                style="
                                  width: 54px;
                                  height: 54px;
                                  object-fit: scale-down;
                                  background: #fff;
                                  border: 1.5px solid #f1f5f9;
                                  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
                                "
                              />
                              <div class="flex-grow-1">
                                <div class="fw-semibold" style="font-size: 0.88rem">
                                  {{ item.product?.productName }}
                                </div>
                                <div class="text-muted" style="font-size: 0.75rem">
                                  NT$ {{ item.unitPrice.toLocaleString() }} x {{ item.quantity }}
                                </div>
                              </div>
                              <div
                                class="fw-bold"
                                style="font-size: 0.88rem; color: var(--brand-dark)"
                              >
                                NT$ {{ (item.unitPrice * item.quantity).toLocaleString() }}
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
</template>

<style scoped>
.profile-page {
  background-color: #f4f7f9;
  min-height: calc(100vh - 120px);
}

.profile-card-base {
  border-radius: 1rem;
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
  object-fit: scale-down;
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
</style>
