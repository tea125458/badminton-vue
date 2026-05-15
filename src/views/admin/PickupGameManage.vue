<script setup>
import { computed, onMounted, watch } from 'vue'
// 👇 引入所有 Composable（邏輯都拆到外面了，這裡只負責「組裝」）
import { useExport } from '@/composables/useExport'
import { useDateFilter } from '@/composables/useDateFilter'
import { usePickupGameApi } from '@/composables/usePickupGameApi'
import { useGameFilter } from '@/composables/useGameFilter'

// ============================
// 📦 狀態對照表（純 UI 顯示用，不涉及 API）
// ============================
const statusMap = {
  OPEN: '開放中',
  FULL: '已額滿',
  CLOSED: '已結束',
  CANCELLED: '已取消',
}
const skillMap = {
  ALL: '不限',
  BEGINNER: '初級',
  INTERMEDIATE: '中級',
  ADVANCED: '高級',
}

// ============================
// 🔌 Step 1: 初始化 API 層（所有跟後端溝通的邏輯）
// ============================
const {
  pickupGames, courts, signupsMap,
  memberKeyword, memberResults, selectedMember,
  signupKeyword, signupSearchResults, selectedSignupMember,
  editGame, editMemberKeyword, newGame, today, inlineEdit,
  memberBookings, selectedBookingId,
  fetchGames, fetchCourts, searchMembers, selectMember,
  createPickupGame, openEditModal, updatePickupGame,
  cancelPickupGame, batchCancel: doBatchCancel,
  fetchSignups, searchSignupMembers, selectSignupMember,
  addSignup, removeSignup, startInlineEdit, saveInlineEdit,
  fetchMemberBookings, selectAdminBooking,
} = usePickupGameApi()
// ============================
// ⏰ 時間下拉選單的邏輯 (與前台同步的嚴謹連動防呆邏輯)
// ============================
const generateTimeList = (start, end) => {
  const list = []
  for (let i = start; i <= end; i++) {
    list.push(`${i.toString().padStart(2, '0')}:00`)
  }
  return list
}

const getStartTimeOptions = (dateStr) => {
  if (!dateStr) return []
  let startHour = 10
  if (dateStr === today) {
    const currentHour = new Date().getHours()
    if (currentHour + 1 > startHour) {
      startHour = currentHour + 1
    }
  }
  if (startHour > 21) return []
  return generateTimeList(startHour, 21)
}

const getEndTimeOptions = (startTimeStr) => {
  if (!startTimeStr) return []
  const startHour = parseInt(startTimeStr.split(':')[0])
  return generateTimeList(startHour + 1, 22)
}

// 新增揪團的選項
const startTimeOptions = computed(() => getStartTimeOptions(newGame.value.gameDate))
const endTimeOptions = computed(() => getEndTimeOptions(newGame.value.startTime))

// 編輯揪團的選項
const editStartTimeOptions = computed(() => {
  if (!editGame.value) return []
  return getStartTimeOptions(editGame.value.gameDate)
})
const editEndTimeOptions = computed(() => {
  if (!editGame.value) return []
  return getEndTimeOptions(editGame.value.startTime)
})

// 狀態重置 Watchers (新增)
watch(() => newGame.value.gameDate, (newVal, oldVal) => {
  if (newVal && oldVal && newVal !== oldVal) {
    newGame.value.startTime = ''
    newGame.value.endTime = ''
  }
})
watch(() => newGame.value.startTime, (newVal, oldVal) => {
  if (newVal && oldVal && newVal !== oldVal) {
    newGame.value.endTime = ''
  }
})

// 狀態重置 Watchers (編輯)
watch(() => editGame.value?.gameDate, (newVal, oldVal) => {
  if (newVal && oldVal && newVal !== oldVal && editGame.value) {
    editGame.value.startTime = ''
    editGame.value.endTime = ''
  }
})
watch(() => editGame.value?.startTime, (newVal, oldVal) => {
  if (newVal && oldVal && newVal !== oldVal && editGame.value) {
    editGame.value.endTime = ''
  }
})

// 🌟 性別衝突「軟性警告」（後台不鎖死，僅提示）
const isNewGameHostMale = computed(() => {
  if (!selectedMember.value) return false;
  return selectedMember.value.gender === 'MALE' || selectedMember.value.gender === '男';
});
const isNewGameHostFemale = computed(() => {
  if (!selectedMember.value) return false;
  return selectedMember.value.gender === 'FEMALE' || selectedMember.value.gender === '女';
});
const isNewGameGenderConflict = computed(() => {
  const g = newGame.value.requiredGender
  if (isNewGameHostMale.value && g === 'FEMALE') return true
  if (isNewGameHostFemale.value && g === 'MALE') return true
  return false
});

const isEditGameHostMale = computed(() => {
  if (!editGame.value || !editGame.value.host) return false;
  return editGame.value.host.gender === 'MALE' || editGame.value.host.gender === '男';
});
const isEditGameHostFemale = computed(() => {
  if (!editGame.value || !editGame.value.host) return false;
  return editGame.value.host.gender === 'FEMALE' || editGame.value.host.gender === '女';
});
const isEditGameGenderConflict = computed(() => {
  if (!editGame.value) return false
  const g = editGame.value.requiredGender
  if (isEditGameHostMale.value && g === 'FEMALE') return true
  if (isEditGameHostFemale.value && g === 'MALE') return true
  return false
});

// ============================================================
// 搜尋 + 狀態篩選 + 分頁 邏輯
// ============================================================

// ============================
// 📅 Step 2: 初始化日期篩選層
// ============================
const {
  dateFrom, dateTo, showDatePanel, datePresetLabel,
  tempDateFrom, tempDateTo,
  setDateRange, openDatePanel, applyDateRange, cancelDatePanel
} = useDateFilter()

// ============================
// 🔍 Step 3: 初始化篩選 + 排序 + 分頁層
// ============================
const {
  searchQuery, statusFilter, filterGender, sortBy,
  currentPage, pageSize, selectedIds, expandedGameId,
  isRefreshing,
  toggleSelectAll, toggleSignups: doToggleSignups,
  refreshGames: doRefreshGames,
  dateFilteredGames, filteredGames, totalPages, paginatedGames,
} = useGameFilter(pickupGames, getDisplayStatus, dateFrom, dateTo)

// 包裝一層，讓 template 呼叫更簡潔
const toggleSignups = (gameId) => doToggleSignups(gameId, fetchSignups)
const refreshGames = () => doRefreshGames(fetchGames, datePresetLabel)
const batchCancel = async () => {
  const success = await doBatchCancel(selectedIds.value)
  if (success) selectedIds.value = []
}
// ============================
// 📤 Step 4: 初始化導出功能
// ============================
const { exportData: doExport } = useExport()

const exportData = (format) => {
  const dataToExport = filteredGames.value.map((game) => ({
    ID: game.gameId,
    主揪: game.host?.fullName || '未提供',
    電話: game.host?.phone || '未提供',
    場館: game.venue?.venueName || '未指定',
    場地: game.court?.courtName || '未指定',
    日期: game.gameDate,
    時間: `${game.startTime} ~ ${game.endTime}`,
    人數: `${game.currentPlayers}/${game.maxPlayers}`,
    程度: game.level || '不限',
    狀態: getDisplayStatus(game),
  }))
  doExport(dataToExport, format, '揪團名單')
}

// ============================
// 🏷️ 判斷揪團是否已過期（純 UI 判斷，不涉及 API）
// ============================
function getDisplayStatus(game) {
  if (game.status === 'CANCELLED') return 'CANCELLED'
  const endDateTime = new Date(`${game.gameDate}T${game.endTime}`)
  const now = new Date()
  if (endDateTime < now) return 'CLOSED'
  return game.status
}

// ============================
// 🚀 頁面載入
// ============================
onMounted(() => {
  fetchGames()
  fetchCourts()
})
</script>
<template>
  <!-- ============ 編輯揪團 Modal ============ -->
  <!-- v-if="editGame" 確保 editGame 有值時才渲染，避免一開始就報錯 -->
  <div class="modal fade" id="editGameModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <template v-if="editGame">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-pencil-square me-2 text-primary"></i>編輯揪團
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form class="row g-3">
              <!-- 主揪（顯示目前的主揪，不可修改） -->
              <div class="col-12">
                <label class="form-label fw-bold">主揪 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" :value="editMemberKeyword" disabled />
                <small class="text-success">
                  ✔ {{ editGame.host?.fullName }} (ID: {{ editGame.host?.memberId }})
                </small>
              </div>
              <!-- 場地 -->
              <div class="col-12">
                <label class="form-label fw-bold">場地 <span class="text-danger">*</span></label>
                <select class="form-select" v-model="editGame.court.courtId">
                  <option v-for="c in courts" :key="c.courtId" :value="c.courtId">
                    {{ c.venue?.venueName }} / {{ c.courtName }}
                  </option>
                </select>
              </div>
              <!-- 日期 -->
              <div class="col-12">
                <label class="form-label fw-bold">日期 <span class="text-danger">*</span></label>
                <input type="date" class="form-control" v-model="editGame.gameDate" :min="today" />
              </div>
              <!-- 開始時間 -->
              <div class="col-md-6">
                <label class="form-label fw-bold"
                  >開始時間 <span class="text-danger">*</span></label
                >
                <select class="form-select" v-model="editGame.startTime" :disabled="!editGame.gameDate || editStartTimeOptions.length === 0">
                  <option value="" disabled>{{ editStartTimeOptions.length === 0 ? '今日已無時段' : '請選擇...' }}</option>
                  <option v-for="t in editStartTimeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <!-- 結束時間 -->
              <div class="col-md-6">
                <label class="form-label fw-bold"
                  >結束時間 <span class="text-danger">*</span></label
                >
                <select class="form-select" v-model="editGame.endTime" :disabled="!editGame.startTime">
                  <option value="" disabled>請先選擇開始時間</option>
                  <option v-for="t in editEndTimeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <!-- 最大人數 -->
              <div class="col-md-6">
                <label class="form-label fw-bold"
                  >最大人數 <span class="text-danger">*</span></label
                >
                <select class="form-select" v-model="editGame.maxPlayers">
                  <option
                    v-for="n in Array.from({ length: 11 }, (_, i) => i + 2)"
                    :key="n"
                    :value="n"
                  >
                    {{ n }} 人
                  </option>
                </select>
              </div>
              <!-- 程度要求 -->
              <div class="col-md-6">
                <label class="form-label fw-bold">程度要求</label>
                <select class="form-select" v-model="editGame.skillLevel">
                  <option value="ALL">不限</option>
                  <option value="BEGINNER">初級</option>
                  <option value="INTERMEDIATE">中級</option>
                  <option value="ADVANCED">高級</option>
                </select>
              </div>
              <!-- 性別限制 -->
              <div class="col-md-6">
                <label class="form-label fw-bold">性別限制</label>
                <select class="form-select" v-model="editGame.requiredGender">
                  <option value="ALL">不限</option>
                  <option value="MALE">限男性</option>
                  <option value="FEMALE">限女性</option>
                </select>
                <div v-if="isEditGameGenderConflict" class="alert alert-warning d-flex align-items-start mt-2 py-2 px-3 mb-0" style="font-size: 0.82rem;">
                  <i class="bi bi-exclamation-triangle-fill me-2 mt-1 flex-shrink-0"></i>
                  <span>⚠️ 系統提示：您選擇的性別限制與主揪性別衝突。主揪預設會佔用一個名額，請確認此特例操作是否正確。</span>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              <i class="bi bi-x-lg me-1"></i> 取消
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="updatePickupGame"
              data-bs-dismiss="modal"
            >
              <i class="bi bi-check-lg me-1"></i> 儲存
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
  <div class="pickup-games-container p-4 bg-white rounded shadow-sm">
    <!-- ============ 頂部工具列 ============ -->
    <!-- 第一行：標題 + 新增按鈕 -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="mb-0"><i class="bi bi-people-fill me-2"></i>揪團管理</h4>
      <button
        class="btn btn-primary text-nowrap"
        data-bs-toggle="modal"
        data-bs-target="#addGameModal"
      >
        <i class="bi bi-plus-circle-fill me-1"></i> 新增揪團
      </button>
    </div>
    <!-- 第二行：搜尋框（加寬，內嵌搜尋圖示和清除按鈕） -->
    <div class="search-wrapper mb-3">
      <i class="bi bi-search search-icon"></i>
      <input
        type="text"
        class="form-control search-input"
        placeholder="搜尋主揪姓名、電話、場地、日期..."
        v-model="searchQuery"
      />
      <button v-if="searchQuery" class="search-clear-btn" @click="searchQuery = ''" type="button">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <!-- 📅 日期選擇 + 性別條件篩選 + 排序（左右分區） -->
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <!-- ← 左側：日期篩選 + 性別篩選 -->
      <div class="d-flex align-items-center gap-2">
        <div style="position: relative">
          <button
            class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
            @click="openDatePanel"
          >
            <i class="bi bi-calendar3"></i>
            {{ datePresetLabel }}
            <i class="bi bi-chevron-down" style="font-size: 0.7em"></i>
          </button>
          
          <!-- 彈出面板 -->
          <div v-if="showDatePanel" class="date-panel shadow-lg">
            <div class="d-flex">
              <!-- 左側：快捷選項 -->
              <div class="date-panel-presets">
                <button class="date-preset-btn" @click="setDateRange('today')">今天</button>
                <button class="date-preset-btn" @click="setDateRange('yesterday')">昨天</button>
                <button class="date-preset-btn" @click="setDateRange('thisWeek')">本週</button>
                <button class="date-preset-btn" @click="setDateRange('lastWeek')">上週</button>
                <button class="date-preset-btn" @click="setDateRange('thisMonth')">本月</button>
                <button class="date-preset-btn" @click="setDateRange('lastMonth')">上月</button>
                <button class="date-preset-btn" @click="setDateRange('all')">全部</button>
              </div>
              <!-- 右側：手動日期輸入 -->
              <div class="date-panel-inputs">
                <label class="form-label small text-muted mb-1">開始日期</label>
                <input type="date" class="form-control form-control-sm mb-3" v-model="tempDateFrom" />
                <label class="form-label small text-muted mb-1">結束日期</label>
                <input type="date" class="form-control form-control-sm" v-model="tempDateTo" />
              </div>
            </div>
            <!-- 底部按鈕 -->
            <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
              <button class="btn btn-sm btn-outline-secondary" @click="cancelDatePanel">取消</button>
              <button class="btn btn-sm btn-primary" @click="applyDateRange">套用</button>
            </div>
          </div>
          <!-- 遮罩層 -->
          <div v-if="showDatePanel" class="date-panel-backdrop" @click="cancelDatePanel"></div>
        </div>
        
        <!-- 🚻 性別條件篩選 -->
        <select class="form-select form-select-sm" v-model="filterGender" style="width: 140px;">
          <option value="all">全部 (不限)</option>
          <option value="male">限男性</option>
          <option value="female">限女性</option>
        </select>
      </div>

      <!-- → 右側：排序 + 重新整理（操作區） -->
      <div class="d-flex align-items-center gap-2">
        <!-- 🔃 排序下拉選單 -->
        <div class="d-flex align-items-center gap-1">
          <i class="bi bi-sort-down text-muted"></i>
          <select class="form-select form-select-sm" style="width: 150px" v-model="sortBy">
            <option value="default">預設排序</option>
            <option value="dateNewest">日期：最新</option>
            <option value="dateOldest">日期：最舊</option>
            <option value="playersMost">人數：最多</option>
            <option value="playersLeast">人數：最少</option>
          </select>
        </div>
        <!-- 🔄 重新整理按鈕 -->
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="refreshGames"
          title="重新整理"
          :disabled="isRefreshing"
        >
          <i class="bi bi-arrow-clockwise" :class="{ spin: isRefreshing }"></i>
        </button>
        <!-- 📤 導出下拉選單按鈕 (改為藍色實心按鈕) -->
        <div class="dropdown">
          <button
            class="btn btn-primary btn-sm dropdown-toggle d-flex align-items-center gap-1"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i class="bi bi-download"></i>
            <span class="d-none d-md-inline"></span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li>
              <button class="dropdown-item" @click="exportData('EXCEL')">
                <!-- Excel 綠色 -->
                <i class="bi bi-file-earmark-spreadsheet text-success me-2"></i>導出 Excel (.xlsx)
              </button>
            </li>
            <li>
              <button class="dropdown-item" @click="exportData('PDF')">
                <!-- PDF 藍色 -->
                <i class="bi bi-file-earmark-pdf text-primary me-2"></i>導出 PDF (.pdf)
              </button>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li>
              <button class="dropdown-item" @click="exportData('JSON')">
                <!-- JSON 黃色 (利用 warning) -->
                <i class="bi bi-filetype-json text-warning me-2"></i>導出 JSON (.json)
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <!-- 狀態快速篩選按鈕列（計數跟日期篩選連動） -->
    <div class="d-flex gap-2 mb-3 flex-wrap">
      <button
        class="btn btn-sm"
        :class="statusFilter === 'ALL' ? 'btn-dark' : 'btn-outline-dark'"
        @click="statusFilter = 'ALL'"
      >
        全部 ({{ dateFilteredGames.length }})
      </button>
      <button
        class="btn btn-sm"
        :class="statusFilter === 'OPEN' ? 'btn-success' : 'btn-outline-success'"
        @click="statusFilter = 'OPEN'"
      >
        🟢 開放中 ({{ dateFilteredGames.filter((g) => getDisplayStatus(g) === 'OPEN').length }})
      </button>
      <button
        class="btn btn-sm"
        :class="statusFilter === 'FULL' ? 'btn-full' : 'btn-outline-full'"
        @click="statusFilter = 'FULL'"
      >
        🟡 已額滿 ({{ dateFilteredGames.filter((g) => getDisplayStatus(g) === 'FULL').length }})
      </button>
      <button
        class="btn btn-sm"
        :class="statusFilter === 'CLOSED' ? 'btn-secondary' : 'btn-outline-secondary'"
        @click="statusFilter = 'CLOSED'"
      >
        ⚫ 已結束 ({{ dateFilteredGames.filter((g) => getDisplayStatus(g) === 'CLOSED').length }})
      </button>
      <button
        class="btn btn-sm"
        :class="statusFilter === 'CANCELLED' ? 'btn-secondary' : 'btn-outline-secondary'"
        @click="statusFilter = 'CANCELLED'"
      >
        ⚪ 已取消 ({{
          dateFilteredGames.filter((g) => getDisplayStatus(g) === 'CANCELLED').length
        }})
      </button>
    </div>
    <!-- 批次操作列：只有勾選了至少一個時才顯示 -->
    <div v-if="selectedIds.length" class="d-flex gap-2 mb-3 align-items-center">
      <span class="text-muted small">已選 {{ selectedIds.length }} 筆</span>
      <button class="btn btn-outline-danger btn-sm" @click="batchCancel">
        <i class="bi bi-x-circle me-1"></i>批次取消
      </button>
    </div>
    <!-- ============ 表格 ============ -->
    <div class="table-responsive">
      <table class="table table-hover align-middle text-center">
        <thead class="table-dark">
          <tr>
            <th style="width: 40px">
              <input type="checkbox" @change="toggleSelectAll" />
            </th>
            <th>ID</th>
            <th>主揪</th>
            <th>場地</th>
            <th>日期</th>
            <th>時間</th>
            <th>人數</th>
            <th>程度</th>
            <th>性別限制</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 🔧 用 <template> 包住每場揪團的「資料列 + 展開列」
               這樣 v-for 才能一次產生兩個 <tr>（資料列 + 隱藏的報名列） -->
          <!-- 🔧 從 pickupGames 改成 paginatedGames -->
          <template v-for="game in paginatedGames" :key="game.gameId">
            <!-- 第一列：揪團資料 -->
            <tr>
              <td>
                <input type="checkbox" :value="game.gameId" v-model="selectedIds" />
              </td>
              <td>{{ game.gameId }}</td>
              <td>
                <div class="fw-bold">{{ game.host?.fullName }}</div>
                <!-- 把 ID 換成電話 -->
                <div class="text-muted small">
                  <i class="bi bi-telephone me-1"></i>
                  {{ game.host?.phone || '未提供電話' }}
                </div>
              </td>
              <td>
                <div>{{ game.venue?.venueName }}</div>
                <div class="fw-bold">{{ game.court?.courtName }}</div>
              </td>
              <td class="fw-bold">{{ game.gameDate }}</td>
              <td>
                {{ game.startTime }} ~ <br />
                {{ game.endTime }}
              </td>
              <td>
                <span
                  class="badge rounded-pill px-3 py-2"
                  :class="
                    game.currentPlayers >= game.maxPlayers
                      ? 'bg-danger text-white'
                      : 'bg-info text-dark'
                  "
                >
                  {{ game.currentPlayers }} / {{ game.maxPlayers }}
                </span>
              </td>
              <td>
                <span
                  class="badge"
                  :class="{
                    'bg-secondary': game.skillLevel === 'ALL',
                    'bg-success': game.skillLevel === 'BEGINNER',
                    'bg-primary': game.skillLevel === 'INTERMEDIATE',
                    'bg-danger': game.skillLevel === 'ADVANCED',
                  }"
                >
                  {{ skillMap[game.skillLevel] }}
                </span>
              </td>
              <td>
                <span v-if="game.requiredGender === 'MALE'" class="badge bg-light text-secondary border border-secondary-subtle">
                  限男
                </span>
                <span v-else-if="game.requiredGender === 'FEMALE'" class="badge bg-light text-secondary border border-secondary-subtle">
                  限女
                </span>
                <span v-else class="text-muted small">不限</span>
              </td>
              <td>
                <span
                  class="badge"
                  :class="{
                    'bg-success': getDisplayStatus(game) === 'OPEN',
                    'badge-full': game.status === 'FULL',
                    'bg-dark': getDisplayStatus(game) === 'CLOSED',
                    'bg-secondary': getDisplayStatus(game) === 'CANCELLED',
                  }"
                >
                  {{ statusMap[getDisplayStatus(game)] }}
                </span>
              </td>
              <td>
                <div class="d-flex justify-content-center gap-2">
                  <!-- 查看/收合報名按鈕
                       @click 觸發 toggleSignups
                       按鈕文字和 icon 會根據「是否展開」動態切換 -->
                  <button
                    class="btn btn-sm"
                    :class="
                      expandedGameId === game.gameId ? 'btn-info text-white' : 'btn-outline-info'
                    "
                    @click="toggleSignups(game.gameId)"
                  >
                    <!-- 展開時：向下箭頭 + 收合報名 / 未展開時：播放鍵 + 查看報名 -->
                    <i
                      :class="
                        expandedGameId === game.gameId
                          ? 'bi bi-caret-down-fill'
                          : 'bi bi-caret-right-fill'
                      "
                      class="me-1"
                    ></i>
                    {{ expandedGameId === game.gameId ? '收合報名' : '查看報名' }}
                  </button>

                  <!-- ✏️ 鉛筆按鈕：加上 @click 填資料 + data-bs 開啟編輯 Modal -->
                  <button
                    class="btn btn-outline-primary btn-sm btn-action"
                    @click="openEditModal(game)"
                    data-bs-toggle="modal"
                    data-bs-target="#editGameModal"
                    :disabled="game.status === 'CANCELLED' || getDisplayStatus(game) === 'CLOSED'"
                    :title="game.status === 'CANCELLED' ? '已取消的揪團無法編輯' : (getDisplayStatus(game) === 'CLOSED' ? '已結束的揪團無法編輯' : '')"
                  >
                    <i class="bi bi-pencil-fill"></i>
                  </button>

                  <!-- 軟刪除cancelPickupGame -->
                  <button
                    class="btn btn-outline-danger btn-sm btn-action"
                    @click="cancelPickupGame(game)"
                    :disabled="game.status === 'CANCELLED' || getDisplayStatus(game) === 'CLOSED'"
                    :title="game.status === 'CANCELLED' ? '此揪團已取消' : (getDisplayStatus(game) === 'CLOSED' ? '已結束的揪團無法取消' : '')"
                  >
                    <i class="bi bi-x-circle-fill"></i>
                  </button>
                </div>
              </td>
            </tr>
            <!-- 第二列：報名名單（只有展開時才顯示）
                 v-if 判斷：這場揪團的 gameId 等於目前展開的 ID 時才渲染
                 colspan="10" 讓這一格橫跨整個表格的 10 個直欄 -->
            <tr v-if="expandedGameId === game.gameId">
              <td colspan="10" class="p-0 border-0">
                <div class="bg-light p-4 mx-2 mb-2 rounded-3">
                  <h6 class="fw-bold mb-3"><i class="bi bi-person-lines-fill me-2"></i>報名名單</h6>
                  <!-- 報名名單表格 -->
                  <table class="table table-sm table-bordered bg-white mb-3">
                    <thead class="table-secondary">
                      <tr>
                        <th>會員</th>
                        <th>狀態</th>
                        <th>報名時間</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- 從 signupsMap 中用 gameId 取出這場的報名資料
                           如果還沒抓到或是空的，就不會顯示任何列 -->
                      <tr v-for="s in signupsMap[game.gameId]" :key="s.signupId">
                        <td>{{ s.member?.fullName }}</td>
                        <td>
                          <span class="badge bg-success">{{
                            s.status === 'JOINED' ? '已加入' : s.status
                          }}</span>
                        </td>
                        <td>{{ s.signedUpAt }}</td>
                        <td>
                          <!-- 移除按鈕：點擊時用 SweetAlert2 跳出確認視窗 -->
                          <button
                            class="btn btn-outline-danger btn-sm"
                            @click="removeSignup(s.signupId, game.gameId, s.member?.fullName)"
                            :disabled="game.status === 'CANCELLED' || getDisplayStatus(game) === 'CLOSED'"
                            :title="game.status === 'CANCELLED' ? '已取消的揪團無法移除成員' : (getDisplayStatus(game) === 'CLOSED' ? '已結束的揪團無法移除成員' : '')"
                          >
                            <i class="bi bi-person-dash-fill"></i>
                          </button>
                        </td>
                      </tr>
                      <!-- 如果沒有報名資料，顯示提示文字 -->
                      <tr v-if="!signupsMap[game.gameId]?.length">
                        <td colspan="4" class="text-muted py-3">目前沒有報名紀錄</td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- 新增報名區 -->
                  <div class="d-flex gap-2 align-items-end" style="position: relative">
                    <div class="flex-grow-1" style="position: relative">
                      <input
                        type="text"
                        class="form-control"
                        v-model="signupKeyword"
                        @input="searchSignupMembers"
                        placeholder="輸入姓名或手機搜尋會員"
                        :disabled="game.status === 'CANCELLED' || getDisplayStatus(game) === 'CLOSED'"
                      />
                      <!-- 搜尋結果下拉 -->
                      <ul
                        v-if="signupSearchResults.length"
                        class="list-group mt-1"
                        style="position: absolute; z-index: 1050; width: 100%"
                      >
                        <li
                          v-for="m in signupSearchResults"
                          :key="m.memberId"
                          class="list-group-item list-group-item-action"
                          style="cursor: pointer"
                          @click="selectSignupMember(m)"
                        >
                          {{ m.fullName }} ({{ m.username }}) - {{ m.phone }}
                        </li>
                      </ul>
                    </div>
                    <button class="btn btn-success text-nowrap" @click="addSignup(game.gameId)" :disabled="game.status === 'CANCELLED' || getDisplayStatus(game) === 'CLOSED'">
                      <i class="bi bi-person-plus-fill me-1"></i> 新增報名
                    </button>
                  </div>
                  <!-- 已選擇的會員提示 -->
                  <small v-if="selectedSignupMember" class="text-success d-block mt-1">
                    ✅ 已選擇：{{ selectedSignupMember.fullName }}
                  </small>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <!-- ============ 分頁控制列 ============ -->
    <div class="d-flex justify-content-between align-items-center mt-3">
      <!-- 左邊：顯示筆數資訊 -->
      <div class="text-muted small">
        共 {{ filteredGames.length }} 筆，第 {{ currentPage }} / {{ totalPages }} 頁
      </div>
      <!-- 中間：頁碼按鈕 -->
      <nav>
        <ul class="pagination pagination-sm mb-0">
          <!-- 上一頁 -->
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <a class="page-link" href="#" @click.prevent="currentPage--">«</a>
          </li>
          <!-- 頁碼數字按鈕：v-for 產生 1 到 totalPages -->
          <li
            v-for="page in totalPages"
            :key="page"
            class="page-item"
            :class="{ active: currentPage === page }"
          >
            <a class="page-link" href="#" @click.prevent="currentPage = page">{{ page }}</a>
          </li>
          <!-- 下一頁 -->
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <a class="page-link" href="#" @click.prevent="currentPage++">»</a>
          </li>
        </ul>
      </nav>
      <!-- 右邊：每頁筆數選擇 -->
      <div class="d-flex align-items-center gap-2">
        <label class="form-label mb-0 small text-muted">每頁</label>
        <select class="form-select form-select-sm" style="width: 80px" v-model.number="pageSize">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="30">30</option>
        </select>
        <span class="small text-muted">筆</span>
      </div>
    </div>
    <!-- ============ 新增揪團 Modal ============ -->
    <div class="modal fade" id="addGameModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-plus-circle-fill me-2 text-primary"></i>新增揪團
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form class="row g-3">
              <!-- 主揪搜尋：加上 icon-box -->
              <div class="col-12" style="position: relative">
                <div class="d-flex align-items-center mb-2">
                  <div class="icon-box me-2" style="background-color: rgba(13, 110, 253, 0.1)">
                    <i class="bi bi-person-fill text-primary"></i>
                  </div>
                  <label class="form-label fw-bold mb-0"
                    >主揪 <span class="text-danger">*</span></label
                  >
                </div>
                <input
                  type="text"
                  class="form-control"
                  v-model="memberKeyword"
                  @input="searchMembers"
                  placeholder="輸入姓名或手機搜尋會員"
                />
                <ul
                  v-if="memberResults.length"
                  class="list-group mt-1"
                  style="position: absolute; z-index: 1050; width: 100%"
                >
                  <li
                    v-for="m in memberResults"
                    :key="m.memberId"
                    class="list-group-item list-group-item-action"
                    style="cursor: pointer"
                    @click="selectMember(m)"
                  >
                    {{ m.fullName }} ({{ m.username }}) - {{ m.phone }}
                  </li>
                </ul>
                <small v-if="selectedMember" class="text-success d-block mt-1">
                  ✅ 已選擇：{{ selectedMember.fullName }} (ID: {{ selectedMember.memberId }})
                </small>
              </div>
              <!-- 🌟 選擇該主揪的預約場地 (取代原本自由選場地/日期/時間) -->
              <div class="col-12" v-if="selectedMember">
                <div class="d-flex align-items-center mb-2">
                  <div class="icon-box me-2" style="background-color: rgba(25, 135, 84, 0.1)">
                    <i class="bi bi-calendar-check-fill text-success"></i>
                  </div>
                  <label class="form-label fw-bold mb-0"
                    >選擇預約場地 <span class="text-danger">*</span></label
                  >
                </div>
                <select class="form-select" v-model="selectedBookingId" @change="selectAdminBooking(selectedBookingId)">
                  <option :value="null" disabled>請選擇該會員的可用預約...</option>
                  <option v-for="b in memberBookings" :key="b.bookingId" :value="b.bookingId">
                    {{ b.bookingDate }} ({{ b.startTime }}-{{ b.endTime }}) | {{ b.venueName }} - {{ b.courtName }}
                  </option>
                </select>
                <small v-if="memberBookings.length === 0" class="text-warning d-block mt-1">
                  ⚠️ 該會員目前沒有可用的預約紀錄
                </small>
              </div>
              <!-- 🌟 自動帶入的預約資訊 (唯讀顯示) -->
              <div class="col-12" v-if="selectedBookingId">
                <div class="card bg-light border-0 rounded-3 p-3">
                  <div class="row text-secondary small fw-medium">
                    <div class="col-12 mb-2">
                      <i class="bi bi-geo-alt me-1 text-primary"></i>
                      {{ newGame._venueName }} - {{ newGame._courtName }}
                    </div>
                    <div class="col-6">
                      <i class="bi bi-calendar-event me-1 text-warning"></i>
                      {{ newGame.gameDate }}
                    </div>
                    <div class="col-6">
                      <i class="bi bi-clock me-1 text-info"></i>
                      {{ newGame.startTime }} ~ {{ newGame.endTime }}
                    </div>
                  </div>
                </div>
              </div>
              <!-- 以下欄位：選完預約後才顯示 -->
              <template v-if="selectedBookingId">
              <!-- 最大人數 -->
              <div class="col-md-6">
                <div class="d-flex align-items-center mb-2">
                  <div class="icon-box me-2" style="background-color: rgba(111, 66, 193, 0.1)">
                    <i class="bi bi-people-fill" style="color: #6f42c1"></i>
                  </div>
                  <label class="form-label fw-bold mb-0"
                    >最大人數 <span class="text-danger">*</span></label
                  >
                </div>
                <select class="form-select" v-model="newGame.maxPlayers">
                  <option
                    v-for="n in Array.from({ length: 11 }, (_, i) => i + 2)"
                    :key="n"
                    :value="n"
                  >
                    {{ n }} 人
                  </option>
                </select>
              </div>
              <!-- 程度要求 -->
              <div class="col-md-6">
                <div class="d-flex align-items-center mb-2">
                  <div class="icon-box me-2" style="background-color: rgba(255, 193, 7, 0.15)">
                    <i class="bi bi-bar-chart-fill text-warning"></i>
                  </div>
                  <label class="form-label fw-bold mb-0">程度要求</label>
                </div>
                <select class="form-select" v-model="newGame.skillLevel">
                  <option value="ALL">不限</option>
                  <option value="BEGINNER">初級</option>
                  <option value="INTERMEDIATE">中級</option>
                  <option value="ADVANCED">高級</option>
                </select>
              </div>
              <!-- 性別限制 -->
              <div class="col-md-12">
                <div class="d-flex align-items-center mb-2">
                  <div class="icon-box me-2" style="background-color: rgba(236, 72, 153, 0.15)">
                    <i class="bi bi-gender-ambiguous" style="color: #ec4899"></i>
                  </div>
                  <label class="form-label fw-bold mb-0">性別限制</label>
                </div>
                <select class="form-select" v-model="newGame.requiredGender">
                  <option value="ALL">不限</option>
                  <option value="MALE">限男性</option>
                  <option value="FEMALE">限女性</option>
                </select>
                <div v-if="isNewGameGenderConflict" class="alert alert-warning d-flex align-items-start mt-2 py-2 px-3 mb-0" style="font-size: 0.82rem;">
                  <i class="bi bi-exclamation-triangle-fill me-2 mt-1 flex-shrink-0"></i>
                  <span>⚠️ 系統提示：您選擇的性別限制與主揪性別衝突。主揪預設會佔用一個名額，請確認此特例操作是否正確。</span>
                </div>
              </div>
              </template>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              <i class="bi bi-x-lg me-1"></i> 取消
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="createPickupGame"
              data-bs-dismiss="modal"
              :disabled="!selectedBookingId || !selectedMember"
            >
              <i class="bi bi-check-lg me-1"></i> 儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<!-- 🔧 加上 scoped 的 CSS，讓 icon-box 樣式只在這個元件內生效 -->
<style scoped>
.badge-full {
  background-color: #e8a317;
  color: #fff;
}
/* 🔧 篩選按鈕 - 已額滿（實心版：選中狀態用） */
.btn-full {
  background-color: #e8a317;
  border-color: #e8a317;
  color: white;
}
.btn-full:hover {
  background-color: #d19214;
  border-color: #d19214;
  color: white;
}
/* 🔧 篩選按鈕 - 已額滿（空心版：未選中狀態用） */
.btn-outline-full {
  color: #e8a317;
  border-color: #e8a317;
}
.btn-outline-full:hover {
  background-color: #e8a317;
  color: white;
}
/* 讓操作欄的按鈕等寬，排列更整齊 */
.btn-action {
  min-width: 36px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-box {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 📅 日期選擇面板 */
.date-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1060;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  padding: 20px;
  margin-top: 8px;
  min-width: 420px;
  animation: fadeIn 0.15s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.date-panel-presets {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 16px;
  border-right: 1px solid #eee;
  min-width: 90px;
}
.date-preset-btn {
  background: none;
  border: none;
  padding: 8px 12px;
  text-align: left;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #495057;
  cursor: pointer;
  transition: background 0.15s;
}
.date-preset-btn:hover {
  background-color: #f0f4ff;
  color: #0d6efd;
}
.date-panel-inputs {
  padding-left: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.date-panel-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1059;
}
/* 🔍 搜尋框樣式 */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 14px;
  color: #adb5bd;
  font-size: 0.9rem;
  pointer-events: none;
  z-index: 2;
}
.search-input {
  padding-left: 38px !important;
  padding-right: 38px !important;
  border-radius: 8px !important;
  border: 1px solid #dee2e6;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.search-input:focus {
  border-color: #86b7fe;
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
}
.search-clear-btn {
  position: absolute;
  right: 8px;
  background: #e9ecef;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6c757d;
  font-size: 0.7rem;
  transition: background 0.15s;
  z-index: 2;
}
.search-clear-btn:hover {
  background: #ced4da;
  color: #343a40;
}
/* 🔄 重新整理旋轉動畫 */
.spin {
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
