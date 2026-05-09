<script setup>
import { ref, onMounted, computed } from 'vue'
import { bookingApi } from '@/api/booking'
import { venueApi } from '@/api/venue'
import { courtApi } from '@/api/court'

// ========== 資料狀態 ==========
const bookings = ref([]) // 預約列表
const venues = ref([]) // 場館列表（下拉選單用）
const allCourts = ref([]) // 所有球場（場館連動篩選用）
const loading = ref(true) // 載入中
const errorMsg = ref('') // 錯誤訊息

// ========== 搜尋 ==========
const searchKeyword = ref('')

// ========== 分頁 ==========
const currentPage = ref(1) // 目前在第幾頁
const pageSize = ref(10) // 每頁顯示幾筆

// ========== 頁面載入時呼叫 ==========
onMounted(() => {
  loadData()
})

// ========== 載入所有資料 ==========
async function loadData() {
  loading.value = true
  errorMsg.value = ''

  try {
    bookings.value = await bookingApi.findAll()
    venues.value = await venueApi.findAll()
    allCourts.value = await courtApi.findAll()
  } catch (error) {
    errorMsg.value = '載入失敗:' + error.message
  } finally {
    loading.value = false
  }
}

// ========== 搜尋 ==========
async function searchBookings() {
  loading.value = true
  errorMsg.value = ''

  try {
    if (searchKeyword.value.trim()) {
      bookings.value = await bookingApi.search(searchKeyword.value)
    } else {
      bookings.value = await bookingApi.findAll()
    }
    currentPage.value = 1 // 搜尋後回到第一頁
  } catch (error) {
    errorMsg.value = '搜尋失敗:' + error.message
  } finally {
    loading.value = false
  }
}

// 清除搜尋
function clearSearch() {
  searchKeyword.value = ''
  loadData()
  currentPage.value = 1
}

// ========== 狀態顯示 ==========
function statusText(status) {
  const map = {
    CONFIRMED: '已確認',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    NO_SHOW: '未到場',
  }
  return map[status] || status
}

function statusClass(status) {
  const map = {
    CONFIRMED: 'bg-success',
    COMPLETED: 'bg-primary',
    CANCELLED: 'bg-secondary',
    NO_SHOW: 'bg-warning text-dark',
  }
  return map[status] || 'bg-secondary'
}

// ========== 變更狀態 ==========
async function changeStatus(id, newStatus) {
  try {
    await bookingApi.updateStatus(id, newStatus)
    loadData()
  } catch (error) {
    alert('狀態更新失敗:' + error.message)
  }
}

// ========== 分頁計算（computed 會自動隨資料更新） ==========
// 總頁數
const totalPages = computed(() => {
  return Math.ceil(bookings.value.length / pageSize.value)
})

// 當前頁要顯示的資料（從 bookings 陣列中「切」出這一頁的部分)
const pagedBookings = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return bookings.value.slice(start, end)
})

// 換頁
function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// ========== Modal 控制 ==========
const showModal = ref(false)
const modalTitle = ref('新增預約')

// 表單欄位
const form = ref({
  venueId: '', // 場館（僅用於前端連動，不送後端）
  courtId: '', // 球場 ID
  memberId: '', // 會員 ID
  memberSearch: '', // 會員搜尋框
  bookingDate: '', // 預約日期
  startTime: '', // 開始時間
  endTime: '', // 結束時間
  totalAmount: '', // 金額
  note: '', // 備註
})

// 會員搜尋結果
const memberResults = ref([])
const selectedMemberText = ref('')

// ========== 場館→球場 連動 ==========
// 根據選擇的場館，篩選出該場館底下的球場
const filteredCourts = computed(() => {
  if (!form.value.venueId) return []
  return allCourts.value.filter(
    (c) => c.venue && c.venue.venueId === Number(form.value.venueId) && c.status === 'ACTIVE',
  )
})

// 場館變更時，清空球場選擇
function onVenueChange() {
  form.value.courtId = ''
}

// ========== 時間連動 ==========
// 可選的開始時間（10:00 ~ 21:00）
const startTimeOptions = [
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
  '22:00',
]

// 根據開始時間，算出可選的結束時間
const endTimeOptions = computed(() => {
  if (!form.value.startTime) return []
  const startHour = parseInt(form.value.startTime)
  const options = []
  for (let h = startHour + 1; h <= 22; h++) {
    options.push(h.toString().padStart(2, '0') + ':00')
  }
  return options
})

// 開始時間變更時，清空結束時間和金額
function onStartTimeChange() {
  form.value.endTime = ''
  form.value.totalAmount = ''
}

// 結束時間變更時，自動計算金額（每小時 300 元）
function onEndTimeChange() {
  if (form.value.startTime && form.value.endTime) {
    const hours = parseInt(form.value.endTime) - parseInt(form.value.startTime)
    form.value.totalAmount = hours * 300
  }
}
</script>

<template>
  <div>
    <h2>🏸 預約管理</h2>
    <p>功能開發中...</p>
  </div>
</template>
