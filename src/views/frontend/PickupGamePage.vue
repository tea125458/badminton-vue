<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Modal } from 'bootstrap'
import PickupGameRow from '@/components/frontend/PickupGameRow.vue'
import CreateGameModal from '@/components/frontend/CreateGameModal.vue'
import { usePickupGameApi } from '@/composables/usePickupGameApi'

const router = useRouter()
const route = useRoute()
const { pickupGames, fetchGames, joinPickupGame } = usePickupGameApi()
// 搜尋與篩選變數
const searchQuery = ref('')
const selectedDateFilter = ref('全部') // 記錄目前點了哪個日期，可能是 '全部', '今天', '明天', '本週末', 或是自訂的 'YYYY-MM-DD'
const createModalRef = ref(null)

// 進階篩選變數
const advancedFilters = ref({
  levels: [], // 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
  hasAvailableSlotsOnly: false,
  timeOfDay: '' // 'morning', 'afternoon', 'evening', ''
})

// Offcanvas 專用的暫存篩選狀態 (按下套用後才正式生效)
const tempFilters = ref({
  levels: [],
  hasAvailableSlotsOnly: false,
  timeOfDay: ''
})

const applyAdvancedFilters = () => {
  advancedFilters.value = JSON.parse(JSON.stringify(tempFilters.value))
  changePage(1)
  // 關閉 Offcanvas
  document.getElementById('closeOffcanvasBtn')?.click()
}

const clearAdvancedFilters = () => {
  tempFilters.value = { levels: [], hasAvailableSlotsOnly: false, timeOfDay: '' }
  advancedFilters.value = { levels: [], hasAvailableSlotsOnly: false, timeOfDay: '' }
  changePage(1)
}
// --- 日期計算小幫手 ---
const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const getTomorrowStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const isWeekend = (dateStr) => {
  const day = new Date(dateStr).getDay()
  return day === 0 || day === 6 // 0是週日，6是週六
}
// --------------------
const availableGames = computed(() => {
  const todayStr = getTodayStr()
  
  // 🌟 基本過濾：過濾掉已取消、已結束，且【只顯示今天或未來的場次】
  let result = pickupGames.value.filter(game => 
    game.status !== 'CANCELLED' && 
    game.status !== 'CLOSED' && 
    game.gameDate >= todayStr
  )

  // 🌟 1. 快速日期篩選
  if (selectedDateFilter.value === '今天') {
    result = result.filter(g => g.gameDate === getTodayStr())
  } else if (selectedDateFilter.value === '明天') {
    result = result.filter(g => g.gameDate === getTomorrowStr())
  } else if (selectedDateFilter.value === '本週末') {
    result = result.filter(g => isWeekend(g.gameDate))
  } else if (selectedDateFilter.value !== '全部' && selectedDateFilter.value !== '') {
    // 選擇具體日期
    result = result.filter(g => g.gameDate === selectedDateFilter.value)
  }

  // 🌟 2. 關鍵字篩選
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(game => {
      const searchText = `${game.court?.venue?.venueName || ''} ${game.court?.courtName || ''} ${game.host?.fullName || ''}`.toLowerCase()
      return searchText.includes(q)
    })
  }

  // 🌟 3. 進階篩選 (Offcanvas)
  if (advancedFilters.value.levels.length > 0) {
    result = result.filter(g => advancedFilters.value.levels.includes(g.skillLevel) || advancedFilters.value.levels.includes(g.level))
  }
  if (advancedFilters.value.hasAvailableSlotsOnly) {
    result = result.filter(g => g.currentPlayers < g.maxPlayers)
  }
  if (advancedFilters.value.timeOfDay) {
    result = result.filter(g => {
      if (!g.startTime) return true
      const startHour = parseInt(g.startTime.split(':')[0])
      if (advancedFilters.value.timeOfDay === 'morning') return startHour >= 10 && startHour < 12
      if (advancedFilters.value.timeOfDay === 'afternoon') return startHour >= 12 && startHour < 18
      if (advancedFilters.value.timeOfDay === 'evening') return startHour >= 18 && startHour <= 22
      return true
    })
  }

  return result
})

// ============================
// 🌟 分頁邏輯 (Pagination) 與 URL 同步
// ============================
// 從網址讀取初始頁碼與每頁筆數，預設為 1 頁、10 筆
const currentPage = ref(Number(route.query.page) || 1)
const itemsPerPage = ref(Number(route.query.size) || 10)

// 監聽網址變化（當使用者按「上一頁」時，確保狀態同步）
watch(() => route.query.page, (newPage) => {
  currentPage.value = Number(newPage) || 1
})
watch(() => route.query.size, (newSize) => {
  itemsPerPage.value = Number(newSize) || 10
})

// 計算總頁數
const totalPages = computed(() => {
  return Math.ceil(availableGames.value.length / itemsPerPage.value) || 1
})

// 當前頁面要顯示的資料 (前端分頁切片)
const paginatedGames = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return availableGames.value.slice(start, end)
})

// 切換頁面函式
const changePage = async (pageNumber) => {
  if (pageNumber < 1 || pageNumber > totalPages.value) return
  
  // 1. 將新頁碼更新到網址上 (這樣上一頁/下一頁才會記住)
  router.push({ query: { ...route.query, page: pageNumber, size: itemsPerPage.value } })
  currentPage.value = pageNumber
  
  // 2. 呼叫後端 API 抓取最新資料
  await fetchGames()
  
  // 3. 平滑回頂部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 變更每頁筆數
const changePageSize = (event) => {
  const newSize = Number(event.target.value)
  itemsPerPage.value = newSize
  // 變更筆數時，為了避免停留在不存在的頁數，一律切換回第 1 頁
  changePage(1)
}
// 🌟 點擊查看詳情：不再直接報名，而是把使用者帶到新的專屬頁面
const handleViewDetails = (game) => {
  router.push(`/pickup/${game.gameId}`)
}

// 🌟 快速查看 (Quick View) 邏輯
const quickViewGame = ref(null)
const selectedLevel = ref('')
const isAgreed = ref(false) // 新增：是否同意規範
let quickViewModalInstance = null

const handleOpenQuickView = (game) => {
  quickViewGame.value = game
  selectedLevel.value = ''
  isAgreed.value = false // 每次打開時重置同意狀態
  
  const modalEl = document.getElementById('quickViewModal')
  if (modalEl) {
    quickViewModalInstance = Modal.getInstance(modalEl) || new Modal(modalEl)
    quickViewModalInstance.show()
  }
}

const goToDetails = () => {
  if (quickViewModalInstance) {
    quickViewModalInstance.hide()
  }
  if (quickViewGame.value) {
    router.push(`/pickup/${quickViewGame.value.gameId}`)
  }
}

const confirmSignup = async () => {
  if (!selectedLevel.value) {
    alert('請先選擇報名程度')
    return
  }
  
  const currentMemberId = 1 // 假資料：目前登入的會員 ID
  await joinPickupGame(quickViewGame.value.gameId, currentMemberId)
  
  if (quickViewModalInstance) {
    quickViewModalInstance.hide()
  }
  await fetchGames() // 重新整理列表
}

onMounted(() => {
  fetchGames()
})
</script>
<template>
  <div class="container py-5 mt-5">

    <!-- 標題區 -->
    <div class="mb-5">
      <h2 class="fw-bold text-dark">羽球臨打活動</h2>
      <p class="text-secondary">尋找適合你的場次，隨時加入熱血對決</p>
    </div>
    <!-- 頂部膠囊型搜尋列 -->
    <div class="d-flex align-items-center gap-3 mb-5 mt-3">

      <!-- 1. 快速日期選擇 -->
      <div class="bg-light rounded-pill p-1 d-flex align-items-center flex-nowrap overflow-hidden" style="border: 1px solid #e2e8f0; white-space: nowrap;">
        <button
          class="btn btn-sm rounded-pill px-4 border-0 transition-all"
          :class="selectedDateFilter === '全部' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          @click="selectedDateFilter = '全部'"
        >全部</button>
        <button
          class="btn btn-sm rounded-pill px-4 border-0 transition-all"
          :class="selectedDateFilter === '今天' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          @click="selectedDateFilter = '今天'"
        >今天</button>
        <button
          class="btn btn-sm rounded-pill px-4 border-0 transition-all"
          :class="selectedDateFilter === '明天' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          @click="selectedDateFilter = '明天'"
        >明天</button>
        <button
          class="btn btn-sm rounded-pill px-4 border-0 transition-all"
          :class="selectedDateFilter === '本週末' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          @click="selectedDateFilter = '本週末'"
        >本週末</button>

        <div class="text-secondary opacity-25 mx-1">|</div>

        <!-- 選擇日期 (自訂) -->
        <div 
          class="btn btn-sm rounded-pill px-3 border-0 transition-all position-relative overflow-hidden mb-0 d-flex align-items-center"
          :class="!['全部','今天','明天','本週末'].includes(selectedDateFilter) ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          style="cursor: pointer;"
        >
          <i class="bi bi-calendar3 me-2" style="color: #65a30d;"></i>
          <span>{{ !['全部','今天','明天','本週末'].includes(selectedDateFilter) ? '📅 ' + selectedDateFilter : '選擇日期' }}</span>
          <input 
            type="date" 
            class="position-absolute top-0 start-0 opacity-0 w-100 h-100 date-input-overlay" 
            v-model="selectedDateFilter"
            @click="$event.target.showPicker?.()"
          />
        </div>
      </div>

      <!-- 2. 主搜尋框 -->
      <div class="flex-grow-1 bg-light rounded-pill d-flex align-items-center px-4 py-2" style="border: 1px solid #e2e8f0;">
        <i class="bi bi-geo-alt fs-5 text-secondary me-3"></i>
        <input type="text" v-model="searchQuery" class="form-control bg-transparent border-0 shadow-none p-0 text-dark" placeholder="搜尋場館、城市或球場...">
      </div>

      <!-- 🌟 發起揪團按鈕 -->
      <button 
        class="btn rounded-pill px-4 text-white fw-bold shadow-sm flex-shrink-0" 
        style="background-color: #0ea5e9;"
        @click="createModalRef.showModal()"
      >
        <i class="bi bi-plus-lg me-1"></i> 發起揪團
      </button>

      <!-- 3. 進階篩選 (觸發 Offcanvas) -->
      <button 
        class="btn rounded-pill px-4 bg-white hover-bg-light flex-shrink-0 position-relative" 
        style="border: 1px solid #e2e8f0;"
        data-bs-toggle="offcanvas" 
        data-bs-target="#advancedFilterOffcanvas"
      >
        <i class="bi bi-sliders me-2 text-dark"></i>
        <span class="text-dark fw-medium">進階篩選</span>
        <!-- 有套用進階篩選時的提示小紅點 -->
        <span v-if="advancedFilters.levels.length || advancedFilters.hasAvailableSlotsOnly || advancedFilters.timeOfDay" 
              class="position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-light rounded-circle">
          <span class="visually-hidden">Active filters</span>
        </span>
      </button>
    </div>

    <!-- 列表資料區 (List Container) -->
    <div class="mt-4">


      <!-- 🌟 自動印出當前頁面的真實資料 -->
      <PickupGameRow
        v-for="game in paginatedGames"
        :key="game.gameId"
        :game="game"
        @open-quick-view="handleOpenQuickView"
        @view-details="handleViewDetails"
      />
      <!-- 如果沒有場次的時候顯示 -->
      <div v-if="availableGames.length === 0" class="text-center py-5 text-secondary">
        目前沒有符合條件的臨打場次喔！
      </div>

      <!-- 🌟 分頁導覽列 (Pagination) 包含資訊列與選擇器 -->
      <div v-if="availableGames.length > 0" class="d-flex justify-content-between align-items-center mt-5 bg-white p-3 rounded-pill shadow-sm" style="border: 1px solid #e2e8f0;">
        
        <!-- 左側：資料筆數資訊 -->
        <div class="text-secondary fw-medium ps-3" style="font-size: 0.95rem;">
          共 {{ availableGames.length }} 筆 · 第 {{ currentPage }} / {{ totalPages }} 頁
        </div>

        <!-- 中間：頁碼按鈕 -->
        <nav aria-label="Page navigation" v-if="totalPages > 1">
          <ul class="pagination pagination-sm mb-0">
            <!-- 上一頁 -->
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link border-0 text-secondary" @click="changePage(currentPage - 1)">
                <i class="bi bi-chevron-left"></i>
              </button>
            </li>
            
            <!-- 頁碼數字 -->
            <li 
              v-for="page in totalPages" 
              :key="page" 
              class="page-item"
            >
              <button 
                class="page-link border-0 fw-bold mx-1 rounded" 
                :class="page === currentPage ? 'bg-primary text-white' : 'text-secondary'"
                @click="changePage(page)"
              >
                {{ page }}
              </button>
            </li>
            
            <!-- 下一頁 -->
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link border-0 text-secondary" @click="changePage(currentPage + 1)">
                <i class="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
        <div v-else></div> <!-- 佔位符，讓 flex-between 正常排版 -->

        <!-- 右側：每頁筆數下拉選單 -->
        <div class="d-flex align-items-center pe-3">
          <span class="text-secondary me-2" style="font-size: 0.95rem;">每頁</span>
          <select 
            class="form-select form-select-sm border-0 shadow-none bg-light text-primary fw-bold cursor-pointer" 
            style="width: 70px;"
            :value="itemsPerPage"
            @change="changePageSize"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
          </select>
          <span class="text-secondary ms-2" style="font-size: 0.95rem;">筆</span>
        </div>
      </div>

    </div>

    <!-- 🌟 掛載發起揪團 Modal -->
    <CreateGameModal ref="createModalRef" @refresh-list="fetchGames" />

    <!-- 🌟 進階篩選 Offcanvas -->
    <div class="offcanvas offcanvas-end" tabindex="-1" id="advancedFilterOffcanvas" aria-labelledby="advancedFilterOffcanvasLabel">
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title fw-bold" id="advancedFilterOffcanvasLabel">⚙️ 進階篩選</h5>
        <button type="button" id="closeOffcanvasBtn" class="btn-close shadow-none" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body">
        
        <!-- 程度 -->
        <div class="mb-4">
          <h6 class="fw-bold mb-3">打球程度</h6>
          <div class="form-check mb-2">
            <input class="form-check-input cursor-pointer" type="checkbox" value="BEGINNER" id="levelBeginner" v-model="tempFilters.levels">
            <label class="form-check-label cursor-pointer" for="levelBeginner">初級 (Beginner)</label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input cursor-pointer" type="checkbox" value="INTERMEDIATE" id="levelIntermediate" v-model="tempFilters.levels">
            <label class="form-check-label cursor-pointer" for="levelIntermediate">中級 (Intermediate)</label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input cursor-pointer" type="checkbox" value="ADVANCED" id="levelAdvanced" v-model="tempFilters.levels">
            <label class="form-check-label cursor-pointer" for="levelAdvanced">高級 (Advanced)</label>
          </div>
        </div>

        <hr class="text-secondary opacity-25">

        <!-- 狀態 -->
        <div class="mb-4">
          <h6 class="fw-bold mb-3">名額狀態</h6>
          <div class="form-check form-switch">
            <input class="form-check-input cursor-pointer" type="checkbox" role="switch" id="statusAvailable" v-model="tempFilters.hasAvailableSlotsOnly">
            <label class="form-check-label cursor-pointer fw-medium text-dark" for="statusAvailable">只顯示尚有名額的揪團</label>
          </div>
        </div>

        <hr class="text-secondary opacity-25">

        <!-- 時段 -->
        <div class="mb-4">
          <h6 class="fw-bold mb-3">時段選擇</h6>
          <div class="form-check mb-2">
            <input class="form-check-input cursor-pointer" type="radio" name="timeOfDay" id="timeAll" value="" v-model="tempFilters.timeOfDay">
            <label class="form-check-label cursor-pointer" for="timeAll">不限時段</label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input cursor-pointer" type="radio" name="timeOfDay" id="timeMorning" value="morning" v-model="tempFilters.timeOfDay">
            <label class="form-check-label cursor-pointer" for="timeMorning">早場 (10:00 - 12:00)</label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input cursor-pointer" type="radio" name="timeOfDay" id="timeAfternoon" value="afternoon" v-model="tempFilters.timeOfDay">
            <label class="form-check-label cursor-pointer" for="timeAfternoon">午場 (12:00 - 18:00)</label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input cursor-pointer" type="radio" name="timeOfDay" id="timeEvening" value="evening" v-model="tempFilters.timeOfDay">
            <label class="form-check-label cursor-pointer" for="timeEvening">晚場 (18:00 - 22:00)</label>
          </div>
        </div>

      </div>
      
      <!-- 底部按鈕 -->
      <div class="offcanvas-footer border-top p-3 d-flex gap-2 bg-light">
        <button class="btn btn-light border flex-grow-1 fw-bold" @click="clearAdvancedFilters">清除條件</button>
        <button class="btn btn-primary flex-grow-1 fw-bold text-white shadow-sm" style="background-color: #0ea5e9; border: none;" @click="applyAdvancedFilters">套用篩選</button>
      </div>
    </div>

    <!-- 🌟 快速查看 Modal (Quick View) -->
    <div class="modal fade" id="quickViewModal" tabindex="-1" aria-labelledby="quickViewModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" id="quickViewModalLabel">⚡ 快速報名</h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" v-if="quickViewGame">
            <!-- 賽事簡短資訊 -->
            <div class="d-flex flex-column gap-2 mb-4 p-3 bg-light rounded-3">
              <div class="fw-bold fs-5 text-dark">{{ quickViewGame.court?.venue?.venueName || '未指定場館' }} 臨打團</div>
              <div class="text-secondary"><i class="bi bi-calendar3 me-2 text-sky-blue"></i> {{ quickViewGame.gameDate }} {{ quickViewGame.startTime }} - {{ quickViewGame.endTime }}</div>
              <div class="text-secondary"><i class="bi bi-geo-alt me-2 text-sky-blue"></i> {{ quickViewGame.court?.courtName || '未指定場地' }}</div>
              <div class="text-primary fw-bold fs-5 mt-2" style="color: #0ea5e9 !important;">NT$ {{ quickViewGame.fee }} <span class="fs-6 text-secondary fw-normal">/ 人</span></div>
            </div>

            <!-- 程度選擇區塊 -->
            <h6 class="fw-bold mb-3">請選擇您的程度</h6>
            <div class="d-flex flex-column gap-2">
              <label class="form-check border rounded-3 p-3 d-flex align-items-center cursor-pointer transition-all" 
                   :class="selectedLevel === 'BEGINNER' ? 'border-primary bg-primary bg-opacity-10' : 'border-light'">
                <input class="form-check-input ms-1 me-3 cursor-pointer" type="radio" name="levelOptions" value="BEGINNER" v-model="selectedLevel">
                <span class="form-check-label fw-medium w-100 cursor-pointer">初級 (Beginner)</span>
              </label>
              <label class="form-check border rounded-3 p-3 d-flex align-items-center cursor-pointer transition-all"
                   :class="selectedLevel === 'INTERMEDIATE' ? 'border-primary bg-primary bg-opacity-10' : 'border-light'">
                <input class="form-check-input ms-1 me-3 cursor-pointer" type="radio" name="levelOptions" value="INTERMEDIATE" v-model="selectedLevel">
                <span class="form-check-label fw-medium w-100 cursor-pointer">中級 (Intermediate)</span>
              </label>
              <label class="form-check border rounded-3 p-3 d-flex align-items-center cursor-pointer transition-all"
                   :class="selectedLevel === 'ADVANCED' ? 'border-primary bg-primary bg-opacity-10' : 'border-light'">
                <input class="form-check-input ms-1 me-3 cursor-pointer" type="radio" name="levelOptions" value="ADVANCED" v-model="selectedLevel">
                <span class="form-check-label fw-medium w-100 cursor-pointer">高級 (Advanced)</span>
              </label>
            </div>

            <!-- 🚨 同意規範 Checkbox -->
            <div class="form-check mt-4 mb-1">
              <input class="form-check-input cursor-pointer shadow-sm border-secondary" type="checkbox" id="quickViewAgree" v-model="isAgreed">
              <label class="form-check-label cursor-pointer text-muted small" for="quickViewAgree" style="line-height: 1.5;">
                我同意遵守本團長的臨打規範與球館安全
              </label>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0 mt-3 d-flex gap-2">
            <button type="button" class="btn btn-light fw-bold flex-grow-1 border" @click="goToDetails">查看完整詳情</button>
            <button type="button" class="btn btn-primary fw-bold text-white shadow-sm flex-grow-1" 
                    style="background-color: #0ea5e9; border: none;" 
                    @click="confirmSignup"
                    :disabled="!isAgreed || quickViewGame?.currentPlayers >= quickViewGame?.maxPlayers">
              {{ quickViewGame?.currentPlayers >= quickViewGame?.maxPlayers ? '已滿團' : '⚡ 確認報名' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* 日期選擇器觸發範圍放大 */
.date-input-overlay {
  cursor: pointer;
}
.date-input-overlay::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.hover-bg-light:hover {
  background-color: #f8fafc !important;
}
input:focus {
  outline: none;
  box-shadow: none;
}
</style>
