<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { venueApi } from '@/api/venue'
import { courtApi } from '@/api/court'
import { bookingApi } from '@/api/booking'
import { useMemberStore } from '@/stores/member'
import { useLinePay } from '@/composables/useLinePay'
import AuthModal from '@/components/frontend/AuthModal.vue'
import CreditCardMock from '@/components/payment/CreditCardMock.vue'

const router = useRouter()
const memberStore = useMemberStore()
const { requestPayment } = useLinePay()
const showAuthModal = ref(false)

// 自訂提示 Modal
const modalVisible = ref(false)
const modalType = ref('success') // 'success' | 'error' | 'warning'
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

function closeModal() {
  modalVisible.value = false
  if (modalCallback.value) {
    modalCallback.value()
    modalCallback.value = null
  }
}

const currentStep = ref(1) // 目前步驟 (1/2/3)

// 步驟定義
const steps = [
  { number: 1, title: '選擇場館' },
  { number: 2, title: '選擇時段' },
  { number: 3, title: '確認預約' },
]

// === Step 1：場館相關 ===
const venues = ref([])
const selectedVenue = ref(null)

// 場館圖片（從 DB 的 image_url 欄位讀取）
const defaultVenueImage = 'https://images.unsplash.com/photo-1626224580194-ff9601fe0674?w=600'

function getVenueImage(venue) {
  return venue.imageUrl || defaultVenueImage
}

// 選擇場館 → 前進到 Step 2
function selectVenue(venue) {
  selectedVenue.value = venue
  currentStep.value = 2
}

// === Step 2：球場 + 日期 + 時段 ===
const allCourts = ref([]) // 所有球場資料
const selectedCourt = ref(null) // 選中的球場
const selectedDate = ref('') // 選擇的日期
const bookedSlots = ref([]) // 已被預約的時段（從 API 取得）
const selectedSlots = ref([]) // 使用者選中的時段

// 今天日期（限制日期選擇器不能選過去）
const today = computed(() => new Date().toISOString().slice(0, 10))

// 所有可選時段（10:00 ~ 22:00，每格代表 1 小時）
const timeSlots = [
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
]

// 取得時段的結束時間（+1 小時）
function slotEndTime(slot) {
  const h = parseInt(slot) + 1
  return h.toString().padStart(2, '0') + ':00'
}

// 判斷時段是否已過（今天的已過時段不可選）
function isPastSlot(slot) {
  if (!selectedDate.value) return false
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10) // 'YYYY-MM-DD'
  if (selectedDate.value !== dateStr) return false // 不是今天→不算過期
  const slotHour = parseInt(slot)
  const currentHour = today.getHours()
  return slotHour <= currentHour // 當前小時以前的時段都算已過
}

// 篩選出「選中場館」底下的 ACTIVE 球場
const filteredCourts = computed(() => {
  if (!selectedVenue.value) return []
  return allCourts.value.filter(
    (c) => c.venue?.venueId === selectedVenue.value.venueId && c.status === 'ACTIVE',
  )
})

// 當球場或日期變更時，查詢該球場該天已被預約的時段
async function loadBookedSlots() {
  // 球場和日期都選了才查
  if (!selectedCourt.value || !selectedDate.value) return

  const bookings = await bookingApi.findByCourtAndDate(
    selectedCourt.value.courtId,
    selectedDate.value,
  )

  // 把已預約的時間範圍展開成一格一格
  // 例如一筆預約 14:00~16:00 → 展開成 ['14:00', '15:00']
  bookedSlots.value = []
  bookings.forEach((b) => {
    const startH = parseInt(b.startTime)
    const endH = parseInt(b.endTime)
    for (let h = startH; h < endH; h++) {
      bookedSlots.value.push(h.toString().padStart(2, '0') + ':00')
    }
  })

  // 清空使用者之前選的時段（因為換了球場或日期）
  selectedSlots.value = []
}

// 點擊時段格子：切換選取/取消（強制連續時段）
function toggleSlot(slot) {
  if (bookedSlots.value.includes(slot)) return // 已預約的不能選
  if (isPastSlot(slot)) return // 已過時段不能選
  const idx = selectedSlots.value.indexOf(slot)
  if (idx >= 0) {
    // 取消選取：只能取消頭尾，避免中間挖空
    const sorted = [...selectedSlots.value].sort()
    if (slot !== sorted[0] && slot !== sorted[sorted.length - 1]) {
      showModal('warning', '提示', '只能取消首尾時段，不能取消中間的時段')
      return
    }
    selectedSlots.value.splice(idx, 1)
  } else {
    // 新增選取：必須與現有選取區段相鄰
    if (selectedSlots.value.length > 0) {
      const sorted = [...selectedSlots.value].sort()
      const firstH = parseInt(sorted[0])
      const lastH = parseInt(sorted[sorted.length - 1])
      const newH = parseInt(slot)
      if (newH !== firstH - 1 && newH !== lastH + 1) {
        showModal('warning', '提示', '請選擇連續的時段（不可跳格選取）')
        return
      }
    }
    selectedSlots.value.push(slot)
  }
  selectedSlots.value.sort() // 保持時間順序
}

// 選擇球場
function selectCourt(court) {
  selectedCourt.value = court
  loadBookedSlots()
}

// 日期變更 → 重置球場與時段（強制按順序操作）
function onDateChange() {
  selectedCourt.value = null
  selectedSlots.value = []
  bookedSlots.value = []
}

// Step 2 → Step 3：驗證後才前進
function goToConfirm() {
  if (!selectedCourt.value) {
    showModal('warning', '提示', '請先選擇球場')
    return
  }
  if (!selectedDate.value) {
    showModal('warning', '提示', '請先選擇日期')
    return
  }
  if (selectedSlots.value.length === 0) {
    showModal('warning', '提示', '請至少選擇一個時段')
    return
  }
  // 檢查是否已登入，未登入則彈出 AuthModal
  if (!memberStore.isLoggedIn) {
    showAuthModal.value = true
    return
  }
  currentStep.value = 3
}

// AuthModal 登入/註冊成功 → 自動推進到 Step 3
function onAuthSuccess() {
  showAuthModal.value = false
  currentStep.value = 3
}

// 頁面載入時，從 API 取得場館列表
onMounted(async () => {
  const all = await venueApi.findAll()
  venues.value = all.filter((v) => v.status === 'ACTIVE')
  allCourts.value = await courtApi.findAll() // ← 加這行
})

// === Step 3：確認預約 + 付款 ===
// 起始時間（取 selectedSlots 的第一個）
const startTime = computed(() => selectedSlots.value[0] || '')

// 結束時間（取最後一個 +1 小時）
const endTime = computed(() => {
  if (selectedSlots.value.length === 0) return ''
  const lastSlot = selectedSlots.value[selectedSlots.value.length - 1]
  const h = parseInt(lastSlot) + 1
  return h.toString().padStart(2, '0') + ':00'
})

// 總金額 = 選了幾個時段 × 300
const totalAmount = computed(() => selectedSlots.value.length * 300)

// 付款方式
const paymentType = ref('CASH')
const showCreditCardModal = ref(false)
const isSubmitting = ref(false)

const paymentOptions = [
  { value: 'CASH', label: '現金支付', icon: 'bi-cash-stack', desc: '打球時至櫃檯付款' },
  { value: 'CREDIT_CARD', label: '信用卡', icon: 'bi-credit-card', desc: '支援 VISA / MasterCard / JCB' },
  { value: 'TRANSFER', label: '銀行轉帳', icon: 'bi-bank', desc: '下單後請於 24 小時內完成匯款' },
  { value: 'LINE_PAY', label: 'LINE Pay', icon: 'bi-chat-fill', desc: '使用 LINE Pay 行動支付' },
]

const cardLogos = [
  { name: 'Visa', src: 'https://img.icons8.com/color/96/visa.png' },
  { name: 'MasterCard', src: 'https://img.icons8.com/color/96/mastercard-logo.png' },
  { name: 'JCB', src: 'https://img.icons8.com/color/96/jcb.png' },
]

// 送出預約（付款方式分流）
async function submitBooking() {
  if (isSubmitting.value) return

  if (paymentType.value === 'CREDIT_CARD') {
    // 彈出虛擬刷卡機 Modal
    showCreditCardModal.value = true
    return
  }

  await processBooking()
}

// 實際建立預約
async function processBooking() {
  isSubmitting.value = true
  const payload = {
    court: { courtId: selectedCourt.value.courtId },
    // member 由後端從 JWT Token 自動設定，不需前端傳遞
    bookingDate: selectedDate.value,
    startTime: startTime.value,
    endTime: endTime.value,
    totalAmount: totalAmount.value,
    paymentType: paymentType.value,
  }
  try {
    const newBooking = await bookingApi.create(payload)

    if (paymentType.value === 'LINE_PAY') {
      // 跳轉 LINE Pay 付款頁面
      await requestPayment({
        orderId: `BKG-${newBooking.bookingId}`,
        amount: totalAmount.value,
        productName: `羽過天晴場地預約 #${newBooking.bookingId}`
      })
    } else {
      // 現金 / 轉帳 / 信用卡(已模擬) → 顯示成功
      showModal('success', '預約成功！', '請準時前往場館報到！', () => {
        resetBookingState()
        router.push({ path: '/profile', query: { tab: 'bookings' } })
      })
    }
  } catch (error) {
    // 從後端回應中提取可讀錯誤訊息
    const data = error.response?.data
    let msg = '系統忙碌中，請稍後再試'
    if (typeof data === 'string') {
      msg = data
    } else if (data?.message) {
      msg = data.message
    } else if (error.message) {
      msg = error.message
    }
    showModal('error', '預約失敗', msg)
  } finally {
    isSubmitting.value = false
  }
}

// 重置所有狀態
function resetBookingState() {
  currentStep.value = 1
  selectedVenue.value = null
  selectedCourt.value = null
  selectedDate.value = ''
  selectedSlots.value = []
  paymentType.value = 'CASH'
}
</script>

<template>
  <div class="container py-4">
    <!-- 頁面標題 -->
    <h2 class="section-title">📅 預約球場</h2>

    <!-- Step Indicator -->
    <div class="step-indicator d-flex align-items-center justify-content-center mb-5">
      <template v-for="(step, index) in steps" :key="step.number">
        <!-- 圓圈 + 文字 -->
        <div class="text-center">
          <div
            class="step-circle"
            :class="{
              active: currentStep === step.number,
              completed: currentStep > step.number,
            }"
          >
            <!-- 已完成 → 打勾，否則顯示數字 -->
            <i v-if="currentStep > step.number" class="bi bi-check-lg"></i>
            <span v-else>{{ step.number }}</span>
          </div>
          <div class="step-label mt-2" :class="{ 'fw-bold': currentStep === step.number }">
            {{ step.title }}
          </div>
        </div>
        <!-- 連接線（最後一步之後不需要） -->
        <div
          v-if="index < steps.length - 1"
          class="step-line"
          :class="{ completed: currentStep > step.number }"
        ></div>
      </template>
    </div>
    <!-- Step 1：選擇場館 -->
    <div v-if="currentStep === 1">
      <div class="row g-4">
        <div v-for="venue in venues" :key="venue.venueId" class="col-md-6 col-lg-4">
          <div class="card card-rounded shadow-sm border-0 h-100 hover-lift overflow-hidden">
            <!-- 場館圖片 -->
            <div class="img-zoom" style="height: 280px">
              <img
                :src="getVenueImage(venue)"
                :alt="venue.venueName"
                class="card-img-top w-100 h-100"
                style="object-fit: cover"
              />
            </div>
            <div class="card-body p-4">
              <!-- 場館名稱 -->
              <h4 class="card-title fw-bold mb-2" style="font-size: 1.35rem">{{ venue.venueName }}</h4>

              <!-- 地址 -->
              <p class="text-secondary mb-4" style="font-size: 1.05rem">
                <i class="bi bi-geo-alt me-1"></i>{{ venue.address }}
              </p>

              <!-- 選擇按鈕 -->
              <button class="btn btn-brand w-100" style="font-size: 1.1rem; padding: 0.65rem 1rem" @click="selectVenue(venue)">選擇此場館</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2：選擇時段 -->
    <div v-else-if="currentStep === 2">
      <div class="card card-rounded shadow-sm border-0 p-4">
        <!-- 目前選的場館名稱 -->
        <h4 class="fw-bold mb-4" style="font-size: 1.4rem">
          <i class="bi bi-building me-2" style="color: var(--brand-sky)"></i>
          {{ selectedVenue?.venueName }}
        </h4>

        <!-- 上方兩欄：左邊控制項 / 右邊場館預覽 -->
        <div class="row g-4 mb-4">
          <!-- 左欄：日期 → 球場 -->
          <div class="col-lg-7">
            <!-- ① 日期選擇（第一步） -->
            <div class="mb-4">
              <label class="form-label fw-bold" style="font-size: 1.05rem">
                <span class="badge rounded-pill me-1" style="background: var(--brand-teal); font-size: 0.85rem; padding: 0.35rem 0.65rem">1</span>
                選擇日期
              </label>
              <input
                type="date"
                class="form-control"
                style="max-width: 280px; font-size: 1rem"
                v-model="selectedDate"
                :min="today"
                @change="onDateChange"
              />
            </div>

            <!-- ② 球場選擇（需先選日期） -->
            <div class="mb-4">
              <label class="form-label fw-bold" style="font-size: 1.05rem">
                <span class="badge rounded-pill me-1" :style="{ background: selectedDate ? 'var(--brand-teal)' : '#cbd5e1', fontSize: '0.85rem', padding: '0.35rem 0.65rem' }">2</span>
                選擇球場
                <span v-if="!selectedDate" class="text-muted fw-normal ms-2" style="font-size: 0.92rem;">
                  <i class="bi bi-lock me-1"></i>請先選擇日期
                </span>
              </label>
              <div class="d-flex flex-wrap gap-2">
                <button
                  v-for="court in filteredCourts"
                  :key="court.courtId"
                  class="btn"
                  :class="
                    selectedCourt?.courtId === court.courtId ? 'btn-brand' : 'btn-outline-secondary'
                  "
                  :disabled="!selectedDate"
                  style="font-size: 1rem; padding: 0.5rem 1.2rem"
                  @click="selectCourt(court)"
                >
                  {{ court.courtName }}
                </button>
              </div>
            </div>

            <!-- 場館備註 -->
            <div class="p-3 rounded-3" style="background-color: #F0F9FF;">
              <p class="fw-bold mb-2" style="font-size: 1.05rem; color: var(--brand-sky);">
                <i class="bi bi-info-circle me-1"></i>場館資訊
              </p>
              <ul class="mb-0 text-secondary" style="font-size: 1rem; padding-left: 1.2rem; line-height: 1.8;">
                <li>營業時間：10:00 ~ 22:00</li>
                <li>每小時場地費 NT$300</li>
                <li>提供球拍租借服務（另計費用）</li>
                <li style="color: #DC2626;">
                  <i class="bi bi-exclamation-circle me-1"></i>如需取消預約，請於預約日前一天 23:59 前操作，當天恕無法取消
                </li>
                <li>
                  <i class="bi bi-geo-alt me-1"></i>{{ selectedVenue?.address }}
                </li>
              </ul>
            </div>
          </div>

          <!-- 右欄：場館預覽圖片 -->
          <div class="col-lg-5">
            <div class="card card-rounded border-0 shadow-sm overflow-hidden h-100">
              <div class="img-zoom" style="height: 240px;">
                <img
                  :src="getVenueImage(selectedVenue)"
                  :alt="selectedVenue?.venueName"
                  class="w-100 h-100"
                  style="object-fit: cover;"
                />
              </div>
              <div class="card-body p-3 text-center">
                <h5 class="fw-bold mb-1" style="font-size: 1.2rem">{{ selectedVenue?.venueName }}</h5>
                <p class="text-secondary mb-0" style="font-size: 0.95rem;">
                  <i class="bi bi-geo-alt me-1"></i>{{ selectedVenue?.address }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ③ 時段格子（需先選日期 + 球場） -->
        <div class="mb-3">
          <label class="form-label fw-bold" style="font-size: 1.05rem">
            <span class="badge rounded-pill me-1" :style="{ background: selectedDate && selectedCourt ? 'var(--brand-teal)' : '#cbd5e1', fontSize: '0.85rem', padding: '0.35rem 0.65rem' }">3</span>
            選擇時段
            <span v-if="!selectedDate || !selectedCourt" class="text-muted fw-normal ms-2" style="font-size: 0.92rem;">
              <i class="bi bi-lock me-1"></i>{{ !selectedDate ? '請先選擇日期' : '請先選擇球場' }}
            </span>
          </label>
          <p v-if="selectedDate && selectedCourt" class="text-secondary" style="font-size: 0.95rem">
            🟢 可選 / ⬜ 已預約 / 🔵 已選取 / ⚫ 已過時段 ・每小時 NT$300
          </p>
          <div v-if="selectedDate && selectedCourt" class="d-flex flex-wrap gap-2">
            <button
              v-for="slot in timeSlots"
              :key="slot"
              class="btn slot-btn"
              :class="{
                'slot-past': isPastSlot(slot),
                'slot-booked': !isPastSlot(slot) && bookedSlots.includes(slot),
                'slot-selected': !isPastSlot(slot) && selectedSlots.includes(slot),
                'slot-available': !isPastSlot(slot) && !bookedSlots.includes(slot) && !selectedSlots.includes(slot),
              }"
              :disabled="bookedSlots.includes(slot) || isPastSlot(slot)"
              @click="toggleSlot(slot)"
            >
              {{ slot }}~{{ slotEndTime(slot) }}
            </button>
          </div>
          <!-- 尚未解鎖的提示 -->
          <div v-else class="text-center py-4 rounded-3" style="background: #F8FAFC; border: 2px dashed #E2E8F0;">
            <i class="bi bi-calendar2-check" style="font-size: 2rem; color: #CBD5E1;"></i>
            <p class="text-muted mt-2 mb-0" style="font-size: 0.95rem;">
              {{ !selectedDate ? '請先選擇日期，再選擇球場與時段' : '請先選擇球場，即可查看可用時段' }}
            </p>
          </div>
        </div>
        <!-- 已選時段摘要 -->
        <div v-if="selectedSlots.length > 0" class="alert alert-info mt-3">
          已選<strong>{{ selectedSlots.length }}</strong
          >小時， 預估金額：<strong>NT$ {{ selectedSlots.length * 300 }}</strong>
        </div>
        <!-- Step 2 導航按鈕 -->
        <div class="d-flex gap-3 mt-4">
          <button class="btn btn-outline-secondary" style="font-size: 1.05rem; padding: 0.55rem 1.5rem" @click="currentStep = 1">← 上一步</button>
          <button class="btn btn-brand" style="font-size: 1.05rem; padding: 0.55rem 1.5rem" @click="goToConfirm">下一步 →</button>
        </div>
      </div>
    </div>
    <!-- Step 3：確認預約 + 付款 -->
    <div v-else>
      <div class="row g-4">
        <!-- 左欄：預約明細 + 付款方式 -->
        <div class="col-lg-7">
          <div class="card card-rounded shadow-sm border-0 p-4">
            <h4 class="fw-bold mb-4" style="font-size: 1.4rem">
              <i class="bi bi-clipboard-check me-2" style="color: var(--brand-sky)"></i>
              預約摘要
            </h4>
            <!-- 摘要表格 -->
            <table class="table mb-4" style="font-size: 1.05rem">
              <tbody>
                <tr>
                  <th class="text-secondary" style="width: 130px;">
                    <i class="bi bi-building me-1"></i>場館
                  </th>
                  <td class="fw-semibold">{{ selectedVenue?.venueName }}</td>
                </tr>
                <tr>
                  <th class="text-secondary">
                    <i class="bi bi-columns-gap me-1"></i>球場
                  </th>
                  <td class="fw-semibold">{{ selectedCourt?.courtName }}</td>
                </tr>
                <tr>
                  <th class="text-secondary">
                    <i class="bi bi-calendar3 me-1"></i>日期
                  </th>
                  <td class="fw-semibold">{{ selectedDate }}</td>
                </tr>
                <tr>
                  <th class="text-secondary">
                    <i class="bi bi-clock me-1"></i>時段
                  </th>
                  <td class="fw-semibold">{{ startTime }} ~ {{ endTime }}（{{ selectedSlots.length }} 小時）</td>
                </tr>
              </tbody>
            </table>

            <!-- 付款方式 -->
            <div class="mb-4">
              <h5 class="fw-bold mb-3" style="font-size: 1.15rem">
                <i class="bi bi-wallet2 me-2" style="color: var(--brand-sky)"></i>
                付款方式
              </h5>
              <div class="payment-list">
                <label
                  v-for="opt in paymentOptions"
                  :key="opt.value"
                  class="payment-option"
                  :class="{ active: paymentType === opt.value }"
                >
                  <input type="radio" v-model="paymentType" :value="opt.value" />
                  <div class="payment-radio-circle">
                    <div class="payment-radio-dot"></div>
                  </div>
                  <div class="payment-info">
                    <span class="payment-label">{{ opt.label }}</span>
                    <div v-if="opt.value === 'CREDIT_CARD'" class="payment-desc-wrap">
                      <span class="payment-desc">支援</span>
                      <span class="card-inline-logos">
                        <template v-for="(logo, idx) in cardLogos" :key="logo.name">
                          <span class="card-name-logo">{{ logo.name }}<img :src="logo.src" :alt="logo.name" class="card-logo-sm" /></span>
                          <span v-if="idx < cardLogos.length - 1" class="card-sep">/</span>
                        </template>
                      </span>
                    </div>
                    <span v-else-if="opt.value === 'LINE_PAY'" class="payment-desc">
                      使用 LINE Pay <img src="https://img.icons8.com/color/96/line-me.png" alt="LINE Pay" class="card-logo-sm" style="height: 19px;" /> 行動支付
                    </span>
                    <span v-else class="payment-desc">{{ opt.desc }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- 預約須知 -->
            <div class="p-3 rounded-3 mb-4" style="background-color: #F0F9FF;">
              <p class="fw-bold mb-2" style="font-size: 1.05rem; color: var(--brand-sky);">
                <i class="bi bi-info-circle me-1"></i>預約須知
              </p>
              <ul class="mb-0 text-secondary" style="font-size: 1rem; padding-left: 1.2rem; line-height: 1.8;">
                <li>請於預約時段前 10 分鐘抵達場館</li>
                <li style="color: #DC2626;">
                  <i class="bi bi-exclamation-circle me-1"></i>如需取消預約，請於預約日前一天 23:59 前操作，當天恕無法取消
                </li>
                <li>場館提供球拍租借服務（另計費用）</li>
              </ul>
            </div>
            <!-- 送出按鈕 -->
            <div class="d-flex gap-3">
              <button class="btn btn-outline-secondary" style="font-size: 1.05rem; padding: 0.55rem 1.5rem" @click="currentStep = 2">← 上一步</button>
              <button class="btn btn-brand" style="font-size: 1.05rem; padding: 0.55rem 1.5rem" :disabled="isSubmitting" @click="submitBooking">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                {{ isSubmitting ? '處理中...' : '✅ 確認付款' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 右欄：場館圖片 + 金額 -->
        <div class="col-lg-5">
          <!-- 場館圖片卡片 -->
          <div class="card card-rounded shadow-sm border-0 overflow-hidden mb-4">
            <div class="img-zoom" style="height: 200px;">
              <img
                :src="getVenueImage(selectedVenue)"
                :alt="selectedVenue?.venueName"
                class="w-100 h-100"
                style="object-fit: cover;"
              />
            </div>
            <div class="card-body p-3 text-center">
              <h5 class="fw-bold mb-1" style="font-size: 1.2rem">{{ selectedVenue?.venueName }}</h5>
              <p class="text-secondary mb-0" style="font-size: 0.95rem;">
                <i class="bi bi-geo-alt me-1"></i>{{ selectedVenue?.address }}
              </p>
            </div>
          </div>

          <!-- 金額摘要卡片 -->
          <div class="card card-rounded shadow-sm border-0 p-4" style="background: linear-gradient(135deg, var(--brand-teal-dark), var(--brand-sky-dark)); color: white;">
            <p class="mb-2" style="font-size: 1.05rem; opacity: 0.9;">
              <i class="bi bi-receipt me-1"></i>費用明細
            </p>
            <div class="d-flex justify-content-between mb-2" style="font-size: 1.1rem;">
              <span>場地費 × {{ selectedSlots.length }} 小時</span>
              <span>NT$ {{ totalAmount }}</span>
            </div>
            <hr style="border-color: rgba(255,255,255,0.3);" />
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-bold" style="font-size: 1.1rem">應付金額</span>
              <span class="fw-bold" style="font-size: 1.75rem;">NT$ {{ totalAmount }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 登入/註冊彈窗 -->
    <AuthModal v-model="showAuthModal" @login-success="onAuthSuccess" />

    <!-- 信用卡虛擬刷卡機 Modal -->
    <CreditCardMock
      v-if="showCreditCardModal"
      :amount="totalAmount"
      @close="showCreditCardModal = false"
      @payment-success="() => { showCreditCardModal = false; processBooking() }"
    />
    <!-- 自訂提示 Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="modalVisible" class="custom-modal-overlay" @click.self="closeModal">
          <div class="custom-modal-card">
            <!-- Icon -->
            <div class="modal-icon" :class="modalType">
              <i v-if="modalType === 'success'" class="bi bi-check-lg"></i>
              <i v-else-if="modalType === 'error'" class="bi bi-x-lg"></i>
              <i v-else class="bi bi-exclamation-lg"></i>
            </div>
            <!-- 文字 -->
            <h4 class="modal-title">{{ modalTitle }}</h4>
            <p class="modal-message">{{ modalMessage }}</p>
            <!-- 按鈕 -->
            <button class="btn-modal-confirm" :class="modalType" @click="closeModal">
              {{ modalType === 'success' ? '太棒了' : '我知道了' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.step-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.15rem;
  margin: 0 auto;
  border: 2px solid #cbd5e1;
  color: #94a3b8;
  background-color: white;
  transition: all 0.3s ease;
}
.step-circle.active {
  border-color: var(--brand-teal);
  background-color: var(--brand-teal);
  color: white;
}
.step-circle.completed {
  border-color: var(--brand-teal);
  background-color: var(--brand-teal);
  color: white;
}
.step-line {
  width: 80px;
  height: 3px;
  background-color: #cbd5e1;
  margin: 0 0.5rem;
  margin-bottom: 1.75rem;
  border-radius: 2px;
  transition: background-color 0.3s ease;
}
.step-line.completed {
  background-color: var(--brand-teal);
}
.step-label {
  font-size: 0.95rem;
  color: #64748b;
  white-space: nowrap;
}

/* ----- 時段格子 ----- */
.slot-btn {
  width: 135px;
  padding: 0.6rem 0.5rem;
  font-size: 0.92rem;
  font-weight: 600;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.slot-available {
  background-color: white;
  color: var(--brand-teal);
  border: 2px solid var(--brand-teal);
}

.slot-available:hover {
  background-color: #f0fdfa;
  transform: translateY(-2px);
}

.slot-selected {
  background-color: var(--brand-sky);
  color: white;
  border: 2px solid var(--brand-sky);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.slot-booked {
  background-color: #f1f5f9;
  color: #94a3b8;
  border: 2px solid #e2e8f0;
  cursor: not-allowed;
  opacity: 0.6;
}

.slot-past {
  background-color: #e2e8f0;
  color: #94a3b8;
  border: 2px solid #cbd5e1;
  cursor: not-allowed;
  opacity: 0.5;
  text-decoration: line-through;
}

/* ----- 付款方式 ----- */
.payment-list {
  display: flex;
  flex-direction: column;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid #F1F5F9;
  cursor: pointer;
  transition: background 0.15s;
}
.payment-option:last-child {
  border-bottom: none;
}
.payment-option:hover {
  background: #FAFBFC;
}
.payment-option input[type="radio"] {
  display: none;
}

.payment-radio-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.2s;
}
.payment-option.active .payment-radio-circle {
  border-color: var(--brand-teal);
}

.payment-radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.2s;
}
.payment-option.active .payment-radio-dot {
  background: var(--brand-teal);
}

.payment-info {
  display: flex;
  flex-direction: column;
}
.payment-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1E293B;
}
.payment-desc {
  font-size: 0.75rem;
  color: #94A3B8;
  margin-top: 0.15rem;
}
.payment-desc-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 2px;
}
.card-inline-logos {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
}
.card-name-logo {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.78rem;
  color: #475569;
}
.card-logo-sm {
  height: 17px;
  width: auto;
  vertical-align: middle;
}
.card-sep {
  color: #94a3b8;
  font-size: 0.78rem;
  margin: 0 1px;
}

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

.modal-icon.success {
  background: #ECFDF5;
  color: #10B981;
  border: 3px solid #A7F3D0;
}

.modal-icon.error {
  background: #FEF2F2;
  color: #EF4444;
  border: 3px solid #FECACA;
}

.modal-icon.warning {
  background: #FFFBEB;
  color: #F59E0B;
  border: 3px solid #FDE68A;
}

.modal-title {
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
  letter-spacing: 0.03em;
}

.btn-modal-confirm.success {
  background: linear-gradient(135deg, #10B981, #34D399);
  color: white;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
}

.btn-modal-confirm.error {
  background: linear-gradient(135deg, #EF4444, #F87171);
  color: white;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
}

.btn-modal-confirm.warning {
  background: linear-gradient(135deg, var(--brand-teal), var(--brand-sky));
  color: white;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
}

.btn-modal-confirm:hover {
  transform: translateY(-2px);
  filter: brightness(1.05);
}

/* Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
