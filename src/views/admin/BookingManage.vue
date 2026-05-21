<script setup>
import { ref, onMounted, computed } from 'vue'
import { bookingApi } from '@/api/booking'
import { venueApi } from '@/api/venue'
import { courtApi } from '@/api/court'
import { memberApi } from '@/api/member'
import { useExport } from '@/composables/useExport'

const { exportData } = useExport()

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
    // 依日期降冪排序（新的在上面）
    bookings.value.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))
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
      // 依日期降冪排序
      bookings.value.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))
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
    PENDING: '待付款',
    CONFIRMED: '已確認',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    NO_SHOW: '未到場',
  }
  return map[status] || status
}

function statusClass(status) {
  const map = {
    PENDING: 'badge-pending',
    CONFIRMED: 'badge-active',
    COMPLETED: 'badge-completed',
    CANCELLED: 'badge-inactive',
    NO_SHOW: 'badge-warning',
  }
  return map[status] || 'badge-default'
}

// ========== 通知彈窗 ==========
const notifyVisible = ref(false)
const notifyType = ref('success') // 'success' | 'error' | 'warning'
const notifyTitle = ref('')
const notifyMessage = ref('')

function showNotify(type, title, message) {
  notifyType.value = type
  notifyTitle.value = title
  notifyMessage.value = message
  notifyVisible.value = true
}

function closeNotify() {
  notifyVisible.value = false
}

// ========== 確認刪除彈窗 ==========
const confirmDeleteVisible = ref(false)
const pendingDeleteBooking = ref(null)

function requestDelete(booking) {
  pendingDeleteBooking.value = booking
  confirmDeleteVisible.value = true
}

async function confirmDelete() {
  confirmDeleteVisible.value = false
  if (!pendingDeleteBooking.value) return
  try {
    await bookingApi.delete(pendingDeleteBooking.value.bookingId)
    showNotify('success', '刪除成功', `預約 #${pendingDeleteBooking.value.bookingId} 已刪除`)
    loadData()
  } catch (error) {
    showNotify('error', '刪除失敗', error.response?.data?.message || error.message)
  }
  pendingDeleteBooking.value = null
}

// ========== 付款方式顯示 ==========
function paymentText(type) {
  const map = { CASH: '現金', CREDIT_CARD: '信用卡', TRANSFER: '轉帳', LINE_PAY: 'LINE Pay' }
  return map[type] || type || '-'
}

// ========== 變更狀態 ==========
async function changeStatus(id, newStatus) {
  try {
    await bookingApi.updateStatus(id, newStatus)
    loadData()
  } catch (error) {
    showNotify('error', '狀態更新失敗', error.response?.data?.message || error.message)
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
const isEditMode = ref(false)
const editBookingId = ref(null)

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
  paymentType: '', // 付款方式
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

// ========== 會員模糊搜尋 ==========

async function searchMember() {
  const keyword = form.value.memberSearch.trim()
  if (!keyword) {
    memberResults.value = []
    return
  }
  try {
    memberResults.value = await memberApi.search(keyword)
  } catch (error) {
    console.error('搜尋會員失敗:', error)
  }
}

// 選擇會員
function selectMember(member) {
  form.value.memberId = member.memberId
  selectedMemberText.value = `${member.fullName} (${member.phone || 'N/A'})`
  memberResults.value = [] // 清空搜尋結果
  form.value.memberSearch = '' // 清空搜尋框
}

// ========== 打開新增 Modal ==========
function openCreateModal() {
  isEditMode.value = false
  editBookingId.value = null
  modalTitle.value = '新增預約'
  form.value = {
    venueId: '',
    courtId: '',
    memberId: '',
    memberSearch: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    totalAmount: '',
    paymentType: '',
    note: '',
  }
  selectedMemberText.value = ''
  memberResults.value = []
  showModal.value = true
}

// ========== 打開編輯 Modal ==========
function openEditModal(booking) {
  isEditMode.value = true
  editBookingId.value = booking.bookingId
  modalTitle.value = '編輯預約 #' + booking.bookingId

  // 找出球場所屬場館 ID
  const venueId = booking.court?.venue?.venueId || ''
  form.value = {
    venueId: venueId,
    courtId: booking.court?.courtId || '',
    memberId: booking.member?.memberId || '',
    memberSearch: '',
    bookingDate: booking.bookingDate || '',
    startTime: booking.startTime || '',
    endTime: booking.endTime || '',
    totalAmount: booking.totalAmount || '',
    paymentType: booking.paymentType || '',
    note: booking.note || '',
  }
  selectedMemberText.value = booking.member
    ? `${booking.member.fullName} (${booking.member.phone || 'N/A'})`
    : ''
  memberResults.value = []
  showModal.value = true
}

// ========== 儲存預約（新增 / 編輯共用）==========
async function saveBooking() {
  // 表單驗證
  if (!form.value.memberId) {
    showNotify('warning', '提示', '請選擇會員!')
    return
  }
  if (!form.value.courtId) {
    showNotify('warning', '提示', '請選擇球場!')
    return
  }
  if (!form.value.bookingDate) {
    showNotify('warning', '提示', '請選擇預約日期!')
    return
  }

  try {
    // 組裝要送給後端的資料（不送 venueId 和 memberSearch）
    const payload = {
      court: { courtId: Number(form.value.courtId) },
      member: { memberId: Number(form.value.memberId) },
      bookingDate: form.value.bookingDate,
      startTime: form.value.startTime,
      endTime: form.value.endTime,
      totalAmount: form.value.totalAmount,
      paymentType: form.value.paymentType || null,
      note: form.value.note,
    }

    if (isEditMode.value) {
      await bookingApi.update(editBookingId.value, payload)
      showModal.value = false
      showNotify('success', '編輯成功', '預約資料已更新！')
    } else {
      await bookingApi.create(payload)
      showModal.value = false
      showNotify('success', '新增成功', '預約已成功建立！')
    }
    loadData()
  } catch (error) {
    const msg = error.response?.data?.message || error.message
    showNotify('error', (isEditMode.value ? '編輯' : '新增') + '失敗', msg)
  }
}

// 今天的日期（用於限制日期選擇器）
const today = computed(() => {
  return new Date().toISOString().slice(0, 10)
})

// ========== 匯出功能 ==========
function getExportData() {
  return bookings.value.map((b) => ({
    預約編號: b.bookingId,
    會員姓名: b.member?.fullName || '-',
    電話: b.member?.phone || '-',
    球場: b.court?.courtName || '-',
    預約日期: b.bookingDate || '-',
    開始時間: b.startTime || '-',
    結束時間: b.endTime || '-',
    金額: b.totalAmount || 0,
    付款方式: paymentText(b.paymentType),
    狀態: statusText(b.status),
    備註: b.note || '-',
    建立時間: b.createdAt || '-',
  }))
}

function handleExport(format) {
  exportData(getExportData(), format.toUpperCase(), '預約資料')
}
</script>

<template>
  <!-- 頁面標題 + 搜尋列 + 新增按鈕 -->
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h2 class="page-title"><i class="bi bi-calendar-check"></i> 預約管理</h2>
    <div class="d-flex gap-2 align-items-center">
      <!-- 匯出按鈕 -->
      <div class="dropdown">
        <button
          class="btn btn-outline-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          style="font-size: 0.9rem"
        >
          <i class="bi bi-download me-1"></i>匯出
        </button>
        <ul
          class="dropdown-menu shadow-sm border-0"
          style="border-radius: 0.75rem; font-size: 0.85rem"
        >
          <li>
            <button
              class="dropdown-item d-flex align-items-center gap-2 py-2"
              @click="handleExport('excel')"
            >
              <i class="bi bi-file-earmark-excel text-success"></i> 匯出 Excel
            </button>
          </li>
          <li>
            <button
              class="dropdown-item d-flex align-items-center gap-2 py-2"
              @click="handleExport('json')"
            >
              <i class="bi bi-filetype-json text-primary"></i> 匯出 JSON
            </button>
          </li>
          <li>
            <button
              class="dropdown-item d-flex align-items-center gap-2 py-2"
              @click="handleExport('pdf')"
            >
              <i class="bi bi-file-earmark-pdf text-danger"></i> 匯出 PDF
            </button>
          </li>
        </ul>
      </div>
      <input
        type="text"
        class="form-control"
        style="width: 200px"
        v-model="searchKeyword"
        placeholder="搜尋會員、電話、球場、日期..."
        @keyup.enter="searchBookings"
      />
      <button class="btn btn-outline-secondary" @click="searchBookings">
        <i class="bi bi-search"></i>
      </button>
      <button class="btn btn-outline-danger" v-if="searchKeyword" @click="clearSearch">
        <i class="bi bi-x-lg"></i>
      </button>
      <button class="btn-add" @click="openCreateModal">
        <i class="bi bi-plus-lg"></i> 新增預約
      </button>
    </div>
  </div>

  <!-- 預約資料表格 -->
  <div class="card card-rounded shadow-sm border-0 overflow-hidden">
    <div class="card-body p-0">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th class="ps-4">編號</th>
            <th>會員</th>
            <th>球場</th>
            <th>日期</th>
            <th>時段</th>
            <th>金額</th>
            <th>付款方式</th>
            <th>狀態</th>
            <th style="width: 200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 載入中 -->
          <tr v-if="loading">
            <td colspan="9" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary me-2"></div>
              載入中...
            </td>
          </tr>
          <!-- 載入錯誤 -->
          <tr v-else-if="errorMsg">
            <td colspan="9" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              <br />
              <button class="btn btn-sm btn-outline-primary mt-2" @click="loadData">重試</button>
            </td>
          </tr>
          <!-- 無資料 -->
          <tr v-else-if="pagedBookings.length === 0">
            <td colspan="9" class="text-center text-muted py-4">目前沒有預約資料</td>
          </tr>
          <!-- 正常渲染資料 -->
          <tr v-for="b in pagedBookings" :key="b.bookingId" v-else>
            <td class="ps-4">{{ b.bookingId }}</td>
            <td>
              <div class="fw-bold">{{ b.member?.fullName || '-' }}</div>
              <div class="text-muted small">
                <i class="bi bi-telephone me-1"></i>
                {{ b.member?.phone || '未提供電話' }}
              </div>
            </td>
            <td>{{ b.court?.courtName || '-' }}</td>
            <td>{{ b.bookingDate }}</td>
            <td>{{ b.startTime }} ~ {{ b.endTime }}</td>
            <td>{{ b.totalAmount }}</td>
            <td>{{ paymentText(b.paymentType) }}</td>
            <td>
              <span class="badge" :class="statusClass(b.status)">
                {{ statusText(b.status) }}
              </span>
            </td>
            <td>
              <div class="d-flex gap-1">
                <!-- 編輯按鈕 -->
                <button
                  class="btn btn-sm action-btn action-btn-edit"
                  title="編輯預約"
                  @click="openEditModal(b)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <!-- 刪除按鈕 -->
                <button
                  class="btn btn-sm action-btn action-btn-delete"
                  title="刪除預約"
                  @click="requestDelete(b)"
                >
                  <i class="bi bi-trash3"></i>
                </button>
                <!-- 狀態變更下拉選單 -->
                <div class="dropdown">
                  <button
                    class="btn btn-sm action-btn action-btn-status dropdown-toggle"
                    data-bs-toggle="dropdown"
                    title="變更狀態"
                  >
                    <i class="bi bi-arrow-repeat"></i>
                  </button>
                  <ul class="dropdown-menu">
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(b.bookingId, 'PENDING')"
                      >
                        <i class="bi bi-hourglass-split text-warning me-1"></i>待付款
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(b.bookingId, 'CONFIRMED')"
                      >
                        <i class="bi bi-check-circle text-success me-1"></i>已確認
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(b.bookingId, 'COMPLETED')"
                      >
                        <i class="bi bi-check-all text-primary me-1"></i>已完成
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(b.bookingId, 'CANCELLED')"
                      >
                        <i class="bi bi-x-circle text-danger me-1"></i>已取消
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(b.bookingId, 'NO_SHOW')"
                      >
                        <i class="bi bi-exclamation-triangle text-warning me-1"></i>未到場
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 分頁 -->
  <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
    <ul class="pagination pagination-custom">
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <button class="page-link" @click="goToPage(currentPage - 1)">
          <i class="bi bi-chevron-left"></i>
        </button>
      </li>
      <li v-for="p in totalPages" :key="p" class="page-item" :class="{ active: p === currentPage }">
        <button class="page-link" @click="goToPage(p)">{{ p }}</button>
      </li>
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <button class="page-link" @click="goToPage(currentPage + 1)">
          <i class="bi bi-chevron-right"></i>
        </button>
      </li>
    </ul>
  </nav>

  <!-- ===== 新增/編輯預約 Modal ===== -->
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button class="modal-close" @click="showModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- Row 1: 會員搜尋 -->
          <div class="form-row">
            <div class="form-col">
              <label>會員 <span class="req">*</span></label>
              <!-- 已選中的會員 -->
              <div v-if="selectedMemberText" class="member-selected">
                <span
                  ><i class="bi bi-person-check me-1"></i>{{ selectedMemberText }}（ID:{{
                    form.memberId
                  }}）</span
                >
                <button
                  v-if="!isEditMode"
                  class="member-clear"
                  @click="((selectedMemberText = ''), (form.memberId = ''))"
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
              <!-- 搜尋框（未選中時顯示） -->
              <template v-else-if="!isEditMode">
                <input
                  v-model="form.memberSearch"
                  type="text"
                  placeholder="輸入姓名或電話搜尋..."
                  @input="searchMember"
                />
                <ul v-if="memberResults.length" class="member-dropdown">
                  <li v-for="m in memberResults" :key="m.memberId" @click="selectMember(m)">
                    <i class="bi bi-person me-1"></i>{{ m.fullName }}（{{ m.phone || '無電話' }}）
                  </li>
                </ul>
              </template>
              <!-- 編輯模式：唯讀顯示 -->
              <input v-else :value="selectedMemberText" disabled />
            </div>
          </div>
          <!-- Row 2: 場館 + 球場 -->
          <div class="form-row">
            <div class="form-col">
              <label>場館 <span class="req">*</span></label>
              <select v-model="form.venueId" @change="onVenueChange">
                <option value="" disabled>請選擇場館</option>
                <option v-for="v in venues" :key="v.venueId" :value="v.venueId">
                  {{ v.venueName }}
                </option>
              </select>
            </div>
            <div class="form-col">
              <label>球場 <span class="req">*</span></label>
              <select v-model="form.courtId" :disabled="!form.venueId">
                <option value="" disabled>請先選擇場館</option>
                <option v-for="c in filteredCourts" :key="c.courtId" :value="c.courtId">
                  {{ c.courtName }}
                </option>
              </select>
            </div>
          </div>
          <!-- Row 3: 預約日期 + 開始時間 + 結束時間 -->
          <div class="form-row">
            <div class="form-col">
              <label>預約日期 <span class="req">*</span></label>
              <input
                type="date"
                v-model="form.bookingDate"
                :min="today"
                @click="$event.target.showPicker()"
              />
            </div>
            <div class="form-col-half">
              <label>開始時間 <span class="req">*</span></label>
              <select v-model="form.startTime" @change="onStartTimeChange">
                <option value="" disabled>請選擇</option>
                <option v-for="t in startTimeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="form-col-half">
              <label>結束時間 <span class="req">*</span></label>
              <select v-model="form.endTime" :disabled="!form.startTime" @change="onEndTimeChange">
                <option value="" disabled>請選擇</option>
                <option v-for="t in endTimeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <!-- Row 4: 金額 + 付款方式 -->
          <div class="form-row">
            <div class="form-col-half">
              <label>金額</label>
              <input type="number" v-model="form.totalAmount" readonly />
            </div>
            <div class="form-col">
              <label>付款方式</label>
              <select v-model="form.paymentType">
                <option value="">請選擇</option>
                <option value="CASH">現金</option>
                <option value="CREDIT_CARD">信用卡</option>
                <option value="TRANSFER">轉帳</option>
                <option value="LINE_PAY">LINE Pay</option>
              </select>
            </div>
          </div>
          <!-- Row 5: 備註 -->
          <div class="form-row">
            <div class="form-col">
              <label>備註</label>
              <textarea v-model="form.note" rows="2" placeholder="選填"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showModal = false">取消</button>
          <button class="btn-save" @click="saveBooking">
            <i class="bi bi-check-lg me-1"></i>{{ isEditMode ? '更新' : '儲存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 通知彈窗 -->
  <div
    v-if="notifyVisible"
    class="modal-backdrop fade show"
    style="z-index: 1060"
    @click="closeNotify"
  ></div>
  <div v-if="notifyVisible" class="modal fade show d-block" tabindex="-1" style="z-index: 1070">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 1rem">
        <div class="modal-body text-center py-4 px-4">
          <div v-if="notifyType === 'success'" class="mb-3">
            <i class="bi bi-check-circle-fill" style="font-size: 3rem; color: #10b981"></i>
          </div>
          <div v-else-if="notifyType === 'error'" class="mb-3">
            <i class="bi bi-x-circle-fill" style="font-size: 3rem; color: #ef4444"></i>
          </div>
          <div v-else class="mb-3">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: #f59e0b"></i>
          </div>
          <h5 class="fw-bold mb-2">{{ notifyTitle }}</h5>
          <p class="text-secondary mb-3" style="font-size: 0.95rem">{{ notifyMessage }}</p>
          <button class="btn btn-primary px-4 rounded-pill" @click="closeNotify">我知道了</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 確認刪除彈窗 -->
  <div v-if="confirmDeleteVisible" class="modal-backdrop fade show" style="z-index: 1060"></div>
  <div
    v-if="confirmDeleteVisible"
    class="modal fade show d-block"
    tabindex="-1"
    style="z-index: 1070"
  >
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 1rem">
        <div class="modal-body text-center py-4 px-4">
          <div class="mb-3">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: #ef4444"></i>
          </div>
          <h5 class="fw-bold mb-2">確認刪除</h5>
          <p class="text-secondary mb-3" style="font-size: 0.95rem">
            確定要刪除預約 <strong>#{{ pendingDeleteBooking?.bookingId }}</strong> 嗎？<br />
            會員：{{ pendingDeleteBooking?.member?.fullName || '-' }}<br />
            此操作無法復原。
          </p>
          <div class="d-flex gap-2 justify-content-center">
            <button
              class="btn btn-secondary px-3 rounded-pill"
              @click="confirmDeleteVisible = false"
            >
              取消
            </button>
            <button class="btn btn-danger px-3 rounded-pill" @click="confirmDelete">
              確認刪除
            </button>
          </div>
        </div>
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
  background: #00b4b4;
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

/* ===== 表格儲存格垂直置中 ===== */
.table tbody td {
  vertical-align: middle;
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
.badge-completed {
  background: #dbeafe;
  color: #2563eb;
}
.badge-inactive {
  background: #f1f5f9;
  color: #64748b;
}
.badge-warning {
  background: #fef9c3;
  color: #ca8a04;
}
.badge-default {
  background: #f1f5f9;
  color: #64748b;
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
.action-btn-status:hover {
  background: var(--brand-sky, #0ea5e9);
  color: white;
  border-color: var(--brand-sky, #0ea5e9);
}
.badge-pending {
  background: #fef3c7;
  color: #d97706;
}

/* 編輯按鈕 */
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

/* ===== 自訂分頁（與 ProductManage 統一）===== */
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

/* ===== Modal（與會員管理統一）===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal-box {
  background: white;
  border-radius: 1.25rem;
  width: 100%;
  max-width: 800px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.12);
  animation: modalIn 0.25s ease;
}
@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.modal-close {
  border: none;
  background: none;
  font-size: 1.1rem;
  color: #94a3b8;
  cursor: pointer;
}
.modal-close:hover {
  color: #475569;
}
.modal-body {
  padding: 1.5rem 1.5rem 0.6rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f1f5f9;
}

/* ===== Form Inside Modal ===== */
.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.form-row:last-child {
  margin-bottom: 0;
}
.form-col {
  flex: 1;
}
.form-col-half {
  flex: 0.5;
}
.modal-body label {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 0.3rem;
}
.req {
  color: #ef4444;
}
.modal-body input,
.modal-body select,
.modal-body textarea {
  width: 100%;
  padding: 0.8rem 0.8rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.6rem;
  font-size: 1.2rem;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.2s;
}
.modal-body input:focus,
.modal-body select:focus,
.modal-body textarea:focus {
  border-color: var(--brand-sky);
  background: white;
}
.modal-body input:disabled,
.modal-body select:disabled {
  opacity: 0.5;
}
.modal-body textarea {
  resize: vertical;
  font-family: inherit;
}
.modal-body input[readonly] {
  background: #f1f5f9;
  color: #64748b;
  cursor: default;
}

/* 會員選中狀態 */
.member-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.75rem;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  color: #16a34a;
  font-weight: 600;
}
.member-clear {
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.2rem;
}
.member-clear:hover {
  color: #ef4444;
}

/* 會員搜尋下拉 */
.member-dropdown {
  list-style: none;
  margin: 0.3rem 0 0;
  padding: 0;
  max-height: 180px;
  overflow-y: auto;
  border: 2px solid #e2e8f0;
  border-radius: 0.6rem;
  background: white;
}
.member-dropdown li {
  padding: 0.55rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f1f5f9;
}
.member-dropdown li:last-child {
  border-bottom: none;
}
.member-dropdown li:hover {
  background: #f0f9ff;
  color: var(--brand-sky);
}

/* 日期輸入框內部微調 */
input[type='date']::-webkit-datetime-edit-text {
  padding: 0 0.1rem;
  color: #94a3b8;
}

/* Footer 按鈕 */
.btn-cancel {
  padding: 0.55rem 1.25rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-save {
  padding: 0.55rem 1.25rem;
  border: none;
  border-radius: 0.6rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
