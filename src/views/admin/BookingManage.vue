<script setup>
import { ref, onMounted, computed } from 'vue'
import { bookingApi } from '@/api/booking'
import { venueApi } from '@/api/venue'
import { courtApi } from '@/api/court'
import { memberApi } from '@/api/member'

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
    note: '',
  }
  selectedMemberText.value = ''
  memberResults.value = []
  showModal.value = true
}

// ========== 儲存預約 ==========
async function saveBooking() {
  // 表單驗證
  if (!form.value.memberId) {
    alert('請選擇會員!')
    return
  }
  if (!form.value.courtId) {
    alert('請選擇球場!')
    return
  }
  if (!form.value.bookingDate) {
    alert('請選擇預約日期!')
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
      note: form.value.note,
    }
    await bookingApi.create(payload)
    showModal.value = false
    alert('新增成功!')
    loadData()
  } catch (error) {
    alert('新增失敗：' + error.message)
  }
}

// 今天的日期（用於限制日期選擇器）
const today = computed(() => {
  return new Date().toISOString().slice(0, 10)
})
</script>

<template>
  <!-- 頁面標題 + 搜尋列 + 新增按鈕 -->
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h2 class="fw-bold mb-0" style="font-size: 1.5rem">
      <i class="bi bi-calendar-check me-2" style="color: var(--brand-sky)"></i>預約管理
    </h2>
    <div class="d-flex gap-2">
      <input
        type="text"
        class="form-control"
        style="width: 200px"
        v-model="searchKeyword"
        placeholder="搜尋會員/球場..."
        @keyup.enter="searchBookings"
      />
      <button class="btn btn-outline-secondary" @click="searchBookings">
        <i class="bi bi-search"></i>
      </button>
      <button class="btn btn-outline-danger" v-if="searchKeyword" @click="clearSearch">
        <!--這個X要v-if偵測到searchKeyword有值之後才會出現-->
        <i class="bi bi-x-lg"></i>
      </button>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-plus-lg me-1"></i>新增預約
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
            <th>狀態</th>
            <th style="width: 160px">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 載入中 -->
          <tr v-if="loading">
            <td colspan="8" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary me-2"></div>
              載入中...
            </td>
          </tr>
          <!-- 載入錯誤 -->
          <tr v-else-if="errorMsg">
            <td colspan="8" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              <br />
              <button class="btn btn-sm btn-outline-primary mt-2" @click="loadData">重試</button>
            </td>
          </tr>
          <!-- 無資料 -->
          <tr v-else-if="pagedBookings.length === 0">
            <td colspan="8" class="text-center text-muted py-4">目前沒有預約資料</td>
          </tr>
          <!-- 正常渲染資料 -->
          <tr v-for="b in pagedBookings" :key="b.bookingId" v-else>
            <td class="ps-4">{{ b.bookingId }}</td>
            <td>{{ b.member?.fullName || '-' }}</td>
            <td>{{ b.court?.courtName || '-' }}</td>
            <td>{{ b.bookingDate }}</td>
            <td>{{ b.startTime }} ~ {{ b.endTime }}</td>
            <td>{{ b.totalAmount }}</td>
            <td>
              <span class="badge" :class="statusClass(b.status)">
                {{ statusText(b.status) }}
              </span>
            </td>
            <td>
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 分頁 -->
  <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-3">
    <ul class="pagination">
      <!-- 上一頁 -->
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">‹</a>
      </li>
      <!-- 頁碼 -->
      <li class="page-item" v-for="p in totalPages" :key="p" :class="{ active: p === currentPage }">
        <a class="page-link" href="#" @click.prevent="goToPage(p)">{{ p }}</a>
      </li>
      <!-- 下一頁 -->
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)">›</a>
      </li>
    </ul>
  </nav>

  <!-- 新增預約 Modal -->
  <div v-if="showModal" class="modal-backdrop fade show" @click="showModal = false"></div>
  <div v-if="showModal" class="modal fade show d-block" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ modalTitle }}</h5>
          <button type="button" class="btn-close" @click="showModal = false"></button>
        </div>
        <div class="modal-body">
          <!-- 會員 ID -->
          <div class="mb-3">
            <label class="form-label">會員ID<span class="text-danger">*</span></label>
            <!-- 已選中的會員 -->
            <div
              v-if="selectedMemberText"
              class="alert alert-success py-2 d-flex justify-content-between align-items-center"
            >
              <span>✅{{ selectedMemberText }}(ID:{{ form.memberId }})</span>
              <button
                type="button"
                class="btn-close btn-sm"
                @click="((selectedMemberText = ''), (form.memberId = ''))"
              ></button>
            </div>
            <!-- 搜尋框（未選中時顯示） -->
            <div v-else>
              <input
                type="text"
                class="form-control"
                v-model="form.memberSearch"
                placeholder="輸入姓名或電話搜尋..."
                @input="searchMember"
              />
              <!-- 搜尋結果列表 -->
              <ul
                v-if="memberResults.length"
                class="list-group mt-1"
                style="max-height: 200px; overflow-y: auto"
              >
                <li
                  v-for="m in memberResults"
                  :key="m.memberId"
                  class="list-group-item list-group-item-action"
                  style="cursor: pointer"
                  @click="selectMember(m)"
                >
                  {{ m.fullName }} ({{ m.phone || '無電話' }})
                </li>
              </ul>
            </div>
          </div>
          <!-- 場館選擇（連動用，不送後端） -->
          <div class="mb-3">
            <label class="form-label">場館<span class="text-danger">*</span></label>
            <select class="form-select" v-model="form.venueId" @change="onVenueChange">
              <option value="" disabled="">請選擇場館</option>
              <option v-for="v in venues" :key="v.venueId" :value="v.venueId">
                {{ v.venueName }}
              </option>
            </select>
          </div>
          <!-- 球場選擇（根據場館篩選） -->
          <div class="mb-3">
            <label class="form-label">球場<span class="text-danger">*</span></label>
            <select class="form-select" v-model="form.courtId" :disabled="!form.venueId">
              <option value="" disabled>請先選擇場館</option>
              <option v-for="c in filteredCourts" :key="c.courtId" :value="c.courtId">
                {{ c.courtName }}
              </option>
            </select>
          </div>
          <!-- 預約日期 -->
          <div class="mb-3">
            <label class="form-label">預約日期<span class="text-danger">*</span></label>
            <input type="date" class="form-control" v-model="form.bookingDate" :min="today" />
          </div>
          <!-- 開始時間 -->
          <div class="mb-3">
            <label class="form-label">開始時間<span class="text-danger">*</span></label>
            <select class="form-select" v-model="form.startTime" @change="onStartTimeChange">
              <option value="" disabled>請選擇</option>
              <option v-for="t in startTimeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <!-- 結束時間 -->
          <div class="mb-3">
            <label class="form-label">結束時間<span class="text-danger">*</span></label>
            <select
              class="form-select"
              v-model="form.endTime"
              :disabled="!form.startTime"
              @change="onEndTimeChange"
            >
              <option value="" disabled>請選擇</option>
              <option v-for="t in endTimeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <!-- 金額（自動計算） -->
          <div class="mb-3">
            <label class="form-label">金額</label>
            <input type="number" class="form-control" v-model="form.totalAmount" readonly />
          </div>
          <!-- 備註 -->
          <div class="mb-3">
            <label class="form-label">備註</label>
            <textarea class="form-control" v-model="form.note" rows="2" placeholder="選填">
            </textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
          <button type="button" class="btn btn-primary" @click="saveBooking">
            <i class="bi bi-check-lg me-1"></i>儲存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  background: #FEF3C7;
  color: #D97706;
}
</style>
