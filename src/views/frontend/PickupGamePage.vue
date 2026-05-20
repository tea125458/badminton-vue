<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Modal } from 'bootstrap'
import Swal from 'sweetalert2'
import api from '@/api'
import PickupGameRow from '@/components/frontend/PickupGameRow.vue'
import CreateGameModal from '@/components/frontend/CreateGameModal.vue'
import ManageMatchModal from '@/components/frontend/ManageMatchModal.vue'
import { usePickupGameApi } from '@/composables/usePickupGameApi'
import { useTimeConflict } from '@/composables/useTimeConflict'
import { useMemberStore } from '@/stores/member'
import AuthModal from '@/components/frontend/AuthModal.vue'

const router = useRouter()
const route = useRoute()
const { pickupGames, fetchGames, joinPickupGame, myRegisteredGameIds, fetchMyRegisteredGames } = usePickupGameApi()
const memberStore = useMemberStore()
const showAuthModal = ref(false)
const pendingAction = ref(null)
const { checkTimeConflict } = useTimeConflict()

// 搜尋與篩選變數
const searchQuery = ref('')
const selectedDateFilter = ref('全部') // 記錄目前點了哪個日期，可能是 '全部', '今天', '明天', '本週末', 或是自訂的 'YYYY-MM-DD'
const createModalRef = ref(null)
const manageModalRef = ref(null)
const managedGame = ref(null)
const loggedInMemberId = computed(() => memberStore.memberId)

// 🪶 羽毛背景隨機資料（格線分區，確保均勻分散）
const cols = 4
const rows = 4
// 🪶 羽毛背景（固定位置，看起來自然分散）
const feathers = [
  { x: 3,  y: 2,  size: 200, opacity: 0.30, rotate: 25  },
  { x: 28, y: 8,  size: 170, opacity: 0.30, rotate: 140 },
  { x: 55, y: 5,  size: 190, opacity: 0.30, rotate: 200 },
  { x: 80, y: 3,  size: 160, opacity: 0.30, rotate: 310 },
  { x: 8,  y: 25, size: 180, opacity: 0.30, rotate: 75  },
  { x: 42, y: 22, size: 220, opacity: 0.30, rotate: 160 },
  { x: 70, y: 28, size: 190, opacity: 0.30, rotate: 240 },
  { x: 88, y: 24, size: 160, opacity: 0.30, rotate: 50  },
  { x: 15, y: 55, size: 200, opacity: 0.30, rotate: 120 },
  { x: 50, y: 60, size: 175, opacity: 0.30, rotate: 280 },
  { x: 75, y: 65, size: 210, opacity: 0.30, rotate: 15  },
  { x: 92, y: 70, size: 165, opacity: 0.30, rotate: 190 },
  { x: 5,  y: 75, size: 195, opacity: 0.30, rotate: 55  },
  { x: 35, y: 80, size: 180, opacity: 0.30, rotate: 170 },
  { x: 62, y: 78, size: 205, opacity: 0.30, rotate: 320 },
  { x: 85, y: 85, size: 170, opacity: 0.30, rotate: 95  },
  // 🌟 補中間區域
  { x: 30, y: 42, size: 185, opacity: 0.30, rotate: 210 },
  { x: 55, y: 48, size: 195, opacity: 0.30, rotate: 330 },
  { x: 45, y: 68, size: 175, opacity: 0.30, rotate: 80  },
  { x: 68, y: 50, size: 200, opacity: 0.30, rotate: 145 },
]


for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    feathers.push({
      x: (col / cols) * 95 + Math.random() * (95 / cols),
      y: (row / rows) * 60 + Math.random() * (60 / rows),  // 限制在前60%高度
      size: 70 + Math.random() * 70,
      opacity: 0.08 + Math.random() * 0.05,
      rotate: Math.random() * 360
    })
  }
}

// 進階篩選變數
const advancedFilters = ref({
  levels: [], // 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
  hasAvailableSlotsOnly: false,
  timeOfDay: '', // 'morning', 'afternoon', 'evening', ''
  requiredGender: '' // 'FEMALE', 'MALE', ''
})

// Offcanvas 專用的暫存篩選狀態 (按下套用後才正式生效)
const tempFilters = ref({
  levels: [],
  hasAvailableSlotsOnly: false,
  timeOfDay: '',
  requiredGender: ''
})

const applyAdvancedFilters = () => {
  advancedFilters.value = JSON.parse(JSON.stringify(tempFilters.value))
  changePage(1)
  // 關閉 Offcanvas
  document.getElementById('closeOffcanvasBtn')?.click()
}

const clearAdvancedFilters = () => {
  tempFilters.value = { levels: [], hasAvailableSlotsOnly: false, timeOfDay: '', requiredGender: '' }
  advancedFilters.value = { levels: [], hasAvailableSlotsOnly: false, timeOfDay: '', requiredGender: '' }
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

  // 🌟 基本過濾：過濾掉已取消、已結束，且【只顯示今天或未來且尚未結束的場次】
  const now = new Date()
  let result = pickupGames.value.filter(game => {
    // 資料庫狀態已標記為取消或結束 → 直接排除
    if (game.status === 'CANCELLED' || game.status === 'CLOSED') return false
    // 日期已過 → 排除
    if (game.gameDate < todayStr) return false
    // 🌟 關鍵修正：即使是「今天」的場次，如果結束時間已過也要排除
    if (game.gameDate === todayStr && game.endTime) {
      const endDateTime = new Date(`${game.gameDate}T${game.endTime}`)
      if (endDateTime < now) return false
    }
    return true
  })

  // 🌟 1. 快速日期篩選
if (selectedDateFilter.value === '我的開團' && loggedInMemberId.value) {
    result = result.filter(g => String(g.host?.memberId) === String(loggedInMemberId.value))
  } else if (selectedDateFilter.value === '我的報名' && loggedInMemberId.value) {
    // 👉 新增：利用已經存在的 myRegisteredGameIds 陣列來過濾
    result = result.filter(g => myRegisteredGameIds.value.includes(g.gameId))
  } else if (selectedDateFilter.value === '今天') {
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
  if (advancedFilters.value.requiredGender) {
    result = result.filter(g => (g.requiredGender || g.genderLimit) === advancedFilters.value.requiredGender)
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

// 🌟 Quick View 專用 Computed Helpers
const skillMap = { ALL: '不限', BEGINNER: '初級', INTERMEDIATE: '中級', ADVANCED: '高級' }
const qvSkillLabel = computed(() => {
  if (!quickViewGame.value) return '不限'
  return skillMap[quickViewGame.value.skillLevel] || '不限'
})
// Quick View 專用：動態計算單人費用
// const qvCalculatedFee = computed(() => {
//   if (!quickViewGame.value || !quickViewGame.value.startTime || !quickViewGame.value.endTime) return 0

//   const parseTime = (timeStr) => {
//     const [hours, minutes] = timeStr.split(':').map(Number)
//     return hours + (minutes / 60)
//   }

//   const startHours = parseTime(quickViewGame.value.startTime)
//   const endHours = parseTime(quickViewGame.value.endTime)
//   const duration = Math.max(0, endHours - startHours)

//   const totalCost = duration * 300

//   // 判斷當前使用者是否已經報名
//   const isJoined = isQuickViewRegistered.value
//   // 如果還沒報名，就算入他自己 (分母 +1)；如果已經報名，就直接用當前人數
//   const divisor = isJoined
//     ? (quickViewGame.value.currentPlayers || 1)
//     : (quickViewGame.value.currentPlayers + 1)

//   return Math.ceil(totalCost / divisor)
// })

const qvGenderBadge = computed(() => {
  if (!quickViewGame.value) return null
  const g = quickViewGame.value.requiredGender || 'ALL'
  if (g === 'FEMALE') return { label: '限女性', icon: 'bi-gender-female', class: 'qv-badge-female' }
  if (g === 'MALE') return { label: '限男性', icon: 'bi-gender-male', class: 'qv-badge-male' }
  return { label: '不限男女', icon: 'bi-gender-ambiguous', class: 'qv-badge-all' }
})
const qvProgressPercent = computed(() => {
  if (!quickViewGame.value?.maxPlayers) return 0
  return Math.round((quickViewGame.value.currentPlayers / quickViewGame.value.maxPlayers) * 100)
})
const qvProgressColor = computed(() => {
  if (qvProgressPercent.value >= 100) return 'bg-danger'
  if (qvProgressPercent.value >= 75) return 'bg-warning'
  return 'bg-sky-blue-bar'
})
const qvTags = computed(() => {
  if (!quickViewGame.value?.description) return []
  // 標籤用「・」分隔，取出第一行的標籤部分
  const firstLine = quickViewGame.value.description.split('\n')[0]
  if (firstLine.includes('・')) {
    return firstLine.split('・').map(t => t.trim()).filter(Boolean)
  }
  return []
})
const qvDayOfWeek = computed(() => {
  if (!quickViewGame.value?.gameDate) return ''
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  return days[new Date(quickViewGame.value.gameDate).getDay()]
})

// 🌟 判斷當前快速查看的場次，使用者是否已報名
const isQuickViewRegistered = computed(() => {
  if (!quickViewGame.value) return false
  return myRegisteredGameIds.value.includes(quickViewGame.value.gameId)
})

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
  if (!memberStore.isLoggedIn) {
    if (quickViewModalInstance) {
      quickViewModalInstance.hide()
    }
    pendingAction.value = 'quickView'
    showAuthModal.value = true
    return
  }

  if (!selectedLevel.value) {
    alert('請先選擇報名程度')
    return
  }

  // 🌟 性別防呆檢查
  const memberInfo = memberStore.memberInfo || {}
  const reqGender = quickViewGame.value.requiredGender || quickViewGame.value.genderLimit

  if (reqGender === 'FEMALE' && memberInfo.gender !== 'FEMALE' && memberInfo.gender !== '女') {
    Swal.fire({
      icon: 'error',
      title: '資格不符',
      text: '不好意思，本場次為主揪設定之女性專屬場次喔！',
      confirmButtonColor: '#ec4899', // 使用粉色符合女團氛圍
      confirmButtonText: '我知道了'
    })
    return
  }
  if (reqGender === 'MALE' && memberInfo.gender !== 'MALE' && memberInfo.gender !== '男') {
    Swal.fire({
      icon: 'error',
      title: '資格不符',
      text: '不好意思，本場次為主揪設定之男性專屬場次喔！',
      confirmButtonColor: '#0ea5e9',
      confirmButtonText: '我知道了'
    })
    return
  }

    // 程度防呆
  const levelRank = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 }
  const reqLevel = quickViewGame.value?.skillLevel

  if (reqLevel && reqLevel !== 'ALL' && levelRank[selectedLevel.value] < levelRank[reqLevel]) {
    const levelName = { BEGINNER: '初級', INTERMEDIATE: '中級', ADVANCED: '高級' }
    Swal.fire({
      icon: 'error',
      title: '程度不符',
      text: `本場次最低程度要求為「${levelName[reqLevel]}」，您選擇的程度不符合資格！`,
      confirmButtonColor: '#0ea5e9',
      confirmButtonText: '我知道了'
    })
    return
  }


  const currentMemberId = memberStore.memberId

  // 🕐 時間衝突檢查：確認該時段沒有其他預約或臨打
  const { hasConflict, conflictMessage } = await checkTimeConflict(
    currentMemberId,
    quickViewGame.value.gameDate,
    quickViewGame.value.startTime,
    quickViewGame.value.endTime,
    { excludeGameId: quickViewGame.value.gameId }
  )
  if (hasConflict) {
    Swal.fire({
      icon: 'warning',
      title: '⚠️ 時間衝突',
      text: conflictMessage,
      confirmButtonColor: '#dc3545',
      confirmButtonText: '我知道了'
    })
    return
  }

  await joinPickupGame(quickViewGame.value.gameId, currentMemberId)

  if (quickViewModalInstance) {
    quickViewModalInstance.hide()
  }
  await fetchGames() // 重新整理列表
  await fetchMyRegisteredGames(currentMemberId) // 更新已報名清單
}

const cancelMySignup = async () => {
  const result = await Swal.fire({
    icon: 'warning',
    title: '確定要退出揪團嗎？',
    text: '退出後若想參加，需要重新報名。',
    showCancelButton: true,
    confirmButtonText: '確定退出',
    cancelButtonText: '暫不退出',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
  })

  if (result.isConfirmed) {
    try {
      const currentMemberId = memberStore.memberId
      if (!currentMemberId) return

      // 我們透過後端新增加的 API：DELETE /api/pickup-game-signups/member/{memberId}/game/{gameId} 來取消報名
      // 因為需要 import axios，所以如果前面沒有 import，請直接使用全域或 api instance
      // 由於 usePickupGameApi 沒有匯出，這裡直接使用 api / axios
      await api.delete(`/pickup-game-signups/member/${currentMemberId}/game/${quickViewGame.value.gameId}`)

      Swal.fire({
        icon: 'success',
        title: '已退出揪團',
        text: '期待您下次再一起打球！',
        confirmButtonColor: '#0ea5e9'
      })

      if (quickViewModalInstance) {
        quickViewModalInstance.hide()
      }

      // 重新取得資料以更新 UI
      await fetchGames()
      await fetchMyRegisteredGames(currentMemberId)

    } catch (err) {
      console.error('退出揪團失敗', err)
      Swal.fire({
        icon: 'error',
        title: '退出失敗',
        text: '請稍後再試或聯繫主揪'
      })
    }
  }
}

function handleCreateGameClick() {
  if (!memberStore.isLoggedIn) {
    pendingAction.value = 'create'
    showAuthModal.value = true
    return
  }
  createModalRef.value.showModal()
}

function onAuthSuccess() {
  showAuthModal.value = false
  if (pendingAction.value === 'quickView') {
    const modalEl = document.getElementById('quickViewModal')
    if (modalEl) {
      quickViewModalInstance = Modal.getInstance(modalEl) || new Modal(modalEl)
      quickViewModalInstance.show()
    }
  } else if (pendingAction.value === 'create') {
    createModalRef.value.showModal()
  }
  pendingAction.value = null
}

watch(loggedInMemberId, async (newVal) => {
  if (newVal) {
    await fetchMyRegisteredGames(newVal)
  }
}, { immediate: true })

onMounted(async () => {
  await fetchGames()
})

// 🌟 管理揪團 Modal
const handleManageGame = (game) => {
  managedGame.value = game
  if (manageModalRef.value) {
    manageModalRef.value.showModal()
  }
}
</script>
<template>
  <div class="container py-5 mt-5">

  <!-- 🪶 羽毛背景層 -->
  <div class="feather-bg" aria-hidden="true">
    <img
      v-for="(f, i) in feathers"
      :key="i"
      src="@/assets/images/feathers_watermark.png"
      class="feather-item"
      :style="{
        left: f.x + '%',
        top: f.y + '%',
        width: f.size + 'px',
        opacity: f.opacity,
        transform: `rotate(${f.rotate}deg)`
      }"
    />
  </div>

  <div class="mb-5">
    <h2 class="fw-bold text-dark mb-2">羽球臨打活動</h2>
    <p class="text-secondary mb-0">尋找適合你的場次，隨時加入熱血對決</p>
  </div>


 <div class="d-flex align-items-center gap-3 mb-5 mt-3">

      <div class="bg-light rounded-pill p-1 d-flex align-items-center flex-nowrap overflow-auto shadow-sm hide-scrollbar" style="white-space: nowrap;">
        <button class="btn btn-sm rounded-pill px-4 border-0 transition-all flex-shrink-0" :class="selectedDateFilter === '全部' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'" @click="selectedDateFilter = '全部'">全部</button>
        <button class="btn btn-sm rounded-pill px-4 border-0 transition-all flex-shrink-0" :class="selectedDateFilter === '今天' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'" @click="selectedDateFilter = '今天'">今天</button>
        <button class="btn btn-sm rounded-pill px-4 border-0 transition-all flex-shrink-0" :class="selectedDateFilter === '明天' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'" @click="selectedDateFilter = '明天'">明天</button>
        <button class="btn btn-sm rounded-pill px-4 border-0 transition-all flex-shrink-0" :class="selectedDateFilter === '本週末' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'" @click="selectedDateFilter = '本週末'">本週末</button>

        <button v-if="loggedInMemberId" class="btn btn-sm rounded-pill px-4 border-0 transition-all d-flex align-items-center gap-1 flex-shrink-0" :class="selectedDateFilter === '我的開團' ? 'bg-white shadow-sm fw-bold text-mori-teal' : 'text-secondary opacity-75'" @click="selectedDateFilter = '我的開團'">
          <i class="bi bi-person-fill"></i> 我的開團
        </button>

        <button v-if="loggedInMemberId" class="btn btn-sm rounded-pill px-4 border-0 transition-all d-flex align-items-center gap-1 flex-shrink-0" :class="selectedDateFilter === '我的報名' ? 'bg-white shadow-sm fw-bold text-mori-success' : 'text-secondary opacity-75'" @click="selectedDateFilter = '我的報名'">
          <i class="bi bi-check2-circle"></i> 我的報名
        </button>

        <div class="text-secondary opacity-25 mx-1 flex-shrink-0">|</div>

        <div class="btn btn-sm rounded-pill px-3 border-0 transition-all position-relative overflow-hidden mb-0 d-flex align-items-center flex-shrink-0" :class="!['全部','今天','明天','本週末','我的開團','我的報名'].includes(selectedDateFilter) ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'" style="cursor: pointer;">
          <i class="bi bi-calendar3 me-2" style="color: #65a30d;"></i>
          <span>{{ !['全部','今天','明天','本週末','我的開團','我的報名'].includes(selectedDateFilter) ? '📅 ' + selectedDateFilter : '選擇日期' }}</span>
          <input type="date" class="position-absolute top-0 start-0 opacity-0 w-100 h-100 date-input-overlay" v-model="selectedDateFilter" @click="$event.target.showPicker?.()" />
        </div>
      </div>

      <div class="flex-grow-1 bg-white shadow-sm rounded-pill d-flex align-items-center px-4 py-2 min-w-0">
        <i class="bi bi-geo-alt fs-5 text-secondary me-3 flex-shrink-0"></i>
        <input type="text" v-model="searchQuery" class="form-control bg-transparent border-0 shadow-none p-0 text-dark w-100" placeholder="搜尋場館、城市...">
      </div>

      <button class="btn rounded-pill px-4 text-white fw-bold shadow-sm flex-shrink-0" style="background-color: #457B9D; border: none;" @click="handleCreateGameClick">
        <i class="bi bi-plus-lg me-1"></i> 發起揪團
      </button>

      <button class="btn rounded-pill px-4 bg-white hover-bg-light flex-shrink-0 position-relative shadow-sm" style="border: none;" data-bs-toggle="offcanvas" data-bs-target="#advancedFilterOffcanvas">
        <i class="bi bi-sliders me-2 text-dark"></i>
        <span class="text-dark fw-medium">進階篩選</span>
        <span v-if="advancedFilters.levels.length || advancedFilters.hasAvailableSlotsOnly || advancedFilters.timeOfDay" class="position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-light rounded-circle">
          <span class="visually-hidden">Active filters</span>
        </span>
      </button>

    </div>

    <div class="mt-4">

      <PickupGameRow
        v-for="game in paginatedGames"
        :key="game.gameId"
        :game="game"
        class="pickup-card mb-3"
        :is-registered="myRegisteredGameIds.includes(game.gameId)"
        @open-quick-view="handleOpenQuickView"
        @view-details="handleViewDetails"
        @manage-game="handleManageGame"
      />
      <div v-if="availableGames.length === 0" class="text-center py-5 text-secondary">
        目前沒有符合條件的臨打場次喔！
      </div>

      <div v-if="availableGames.length > 0" class="d-flex justify-content-between align-items-center mt-5 bg-white p-3 rounded-pill shadow-sm">

        <div class="text-secondary fw-medium ps-3" style="font-size: 0.95rem;">
          共 {{ availableGames.length }} 筆 · 第 {{ currentPage }} / {{ totalPages }} 頁
        </div>

        <nav aria-label="Page navigation" v-if="totalPages > 1">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link border-0 text-secondary" @click="changePage(currentPage - 1)">
                <i class="bi bi-chevron-left"></i>
              </button>
            </li>

            <li
              v-for="page in totalPages"
              :key="page"
              class="page-item"
            >
              <button
                class="page-link border-0 fw-bold mx-1 rounded"
                :class="page === currentPage ? 'bg-mori-teal text-white' : 'text-secondary'"
                @click="changePage(page)"
              >
                {{ page }}
              </button>
            </li>

            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link border-0 text-secondary" @click="changePage(currentPage + 1)">
                <i class="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
        <div v-else></div> <div class="d-flex align-items-center pe-3">
          <span class="text-secondary me-2" style="font-size: 0.95rem;">每頁</span>
          <select
            class="form-select form-select-sm border-0 shadow-none bg-light fw-bold cursor-pointer text-mori-teal"
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

    <CreateGameModal ref="createModalRef" @refresh-list="fetchGames" />

    <div class="offcanvas offcanvas-end" tabindex="-1" id="advancedFilterOffcanvas" aria-labelledby="advancedFilterOffcanvasLabel">
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title fw-bold" id="advancedFilterOffcanvasLabel">⚙️ 進階篩選</h5>
        <button type="button" id="closeOffcanvasBtn" class="btn-close shadow-none" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body">

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

        <div class="mb-4">
          <h6 class="fw-bold mb-3">名額狀態</h6>
          <div class="form-check form-switch">
            <input class="form-check-input cursor-pointer" type="checkbox" role="switch" id="statusAvailable" v-model="tempFilters.hasAvailableSlotsOnly">
            <label class="form-check-label cursor-pointer fw-medium text-dark" for="statusAvailable">只顯示尚有名額的揪團</label>
          </div>
        </div>

        <hr class="text-secondary opacity-25">

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

        <div class="mb-4">
          <label class="fw-bold mb-2">性別限制</label>
          <div class="d-flex flex-column gap-2">
            <div class="form-check">
              <input class="form-check-input cursor-pointer" type="radio" name="tempGender" id="genderAll" value="" v-model="tempFilters.requiredGender">
              <label class="form-check-label cursor-pointer text-secondary" for="genderAll">全部 (不限)</label>
            </div>
            <div class="form-check">
              <input class="form-check-input cursor-pointer" type="radio" name="tempGender" id="genderFemale" value="FEMALE" v-model="tempFilters.requiredGender">
              <label class="form-check-label cursor-pointer text-secondary" for="genderFemale">限女性</label>
            </div>
            <div class="form-check">
              <input class="form-check-input cursor-pointer" type="radio" name="tempGender" id="genderMale" value="MALE" v-model="tempFilters.requiredGender">
              <label class="form-check-label cursor-pointer text-secondary" for="genderMale">限男性</label>
            </div>
          </div>
        </div>
      </div>

      <div class="offcanvas-footer border-top p-3 d-flex gap-2 bg-light">
        <button class="btn btn-light border flex-grow-1 fw-bold" @click="clearAdvancedFilters">清除條件</button>
        <button class="btn text-white shadow-sm flex-grow-1 fw-bold" style="background-color: #457B9D; border: none;" @click="applyAdvancedFilters">套用篩選</button>
      </div>
    </div>

    <div class="modal fade" id="quickViewModal" tabindex="-1" aria-labelledby="quickViewModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow-lg">

          <div class="modal-header border-bottom-0 pb-0 pt-3 px-4">
            <h5 class="modal-title fw-bold d-flex align-items-center" id="quickViewModalLabel">
              <i class="bi bi-lightning-charge-fill me-2 text-mori-teal"></i> 快速報名
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <div class="modal-body px-4 pt-3 pb-2" v-if="quickViewGame">

            <div v-if="isQuickViewRegistered" class="alert alert-success d-flex align-items-center mb-3 py-2 px-3 fw-bold" role="alert">
              <i class="bi bi-check-circle-fill me-2 fs-5"></i>
              <div>🎉 報名成功！您已在參與名單中。</div>
            </div>

            <div class="qv-info-card mb-3">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="fw-bold fs-5 text-dark">{{ quickViewGame.court?.venue?.venueName || '未指定場館' }} 臨打團</div>
                <div class="d-flex gap-1 flex-shrink-0">
                  <span class="badge rounded-pill qv-badge-level px-2 py-1">{{ qvSkillLabel }}</span>
                  <span v-if="qvGenderBadge" class="badge rounded-pill px-2 py-1" :class="qvGenderBadge.class">
                    <i class="bi me-1" :class="qvGenderBadge.icon" style="font-size: 0.7rem;"></i>{{ qvGenderBadge.label }}
                  </span>
                </div>
              </div>
              <div class="d-flex flex-column gap-1 text-secondary small">
                <div><i class="bi bi-calendar-event me-2 text-mori-teal"></i>{{ quickViewGame.gameDate }} ({{ qvDayOfWeek }}) {{ quickViewGame.startTime }} - {{ quickViewGame.endTime }}</div>
                <div><i class="bi bi-geo-alt-fill me-2 text-mori-teal"></i>{{ quickViewGame.court?.venue?.venueName || '未指定場館' }} · {{ quickViewGame.court?.courtName || '未指定場地' }}</div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-3 mb-3 p-3 bg-white rounded-3 shadow-sm border-0">
              <div class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0 shadow-sm bg-mori-teal"
                   style="width: 44px; height: 44px; font-size: 1.1rem;">
                {{ quickViewGame.host?.fullName?.charAt(0) || '?' }}
              </div>
              <div class="flex-grow-1">
                <div class="fw-bold text-dark d-flex align-items-center" style="font-size: 0.95rem;">
                  {{ quickViewGame.host?.fullName || '揪團主' }}
                  <a v-if="isQuickViewRegistered && quickViewGame.host?.phone" :href="`tel:${quickViewGame.host.phone}`" class="ms-2 badge bg-success text-white text-decoration-none px-2 py-1">
                    <i class="bi bi-telephone-fill me-1"></i>{{ quickViewGame.host.phone }}
                  </a>
                </div>
                <div v-if="qvTags.length" class="d-flex flex-wrap gap-1 mt-1">
                  <span v-for="tag in qvTags" :key="tag" class="badge rounded-pill qv-tag px-2 py-1">{{ tag }}</span>
                </div>
                <div v-else class="text-muted mt-1" style="font-size: 0.78rem;">歡迎加入一起打球！</div>
              </div>
            </div>

            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold small text-dark"><i class="bi bi-people-fill me-1 text-mori-teal"></i>報名進度</span>
                <span class="fw-bold" style="font-size: 0.9rem;">
                  <span class="text-mori-teal">{{ quickViewGame.currentPlayers }}</span>
                  <span class="text-muted"> / {{ quickViewGame.maxPlayers }} 人</span>
                </span>
              </div>
              <div class="progress rounded-pill" style="height: 6px;">
                <div class="progress-bar rounded-pill" :class="qvProgressColor" role="progressbar" :style="{ width: qvProgressPercent + '%' }"></div>
              </div>
              <div v-if="qvProgressPercent >= 75 && qvProgressPercent < 100" class="text-warning small fw-bold mt-1">
                <i class="bi bi-exclamation-circle me-1"></i>即將額滿，手刀搶位！
              </div>
              <div v-if="qvProgressPercent >= 100" class="text-danger small fw-bold mt-1">
                <i class="bi bi-x-circle me-1"></i>已額滿
              </div>
            </div>

            <div class="text-secondary mb-3 pb-3" style="font-size: 0.85rem; border-bottom: 1px solid #f1f5f9;">
              <i class="bi bi-wallet2 me-1"></i> 本場次費用與付款方式，請於現場依主揪指示結算。
            </div>

            <template v-if="!isQuickViewRegistered">
              <h6 class="fw-bold mb-2 small text-secondary"><i class="bi bi-bar-chart-fill me-1"></i>選擇您的程度</h6>
              <div class="d-flex gap-2 mb-3">
                <label class="qv-level-option flex-grow-1 text-center" :class="{ active: selectedLevel === 'BEGINNER' }">
                  <input type="radio" name="qvLevel" value="BEGINNER" v-model="selectedLevel" class="d-none">
                  <div class="fw-bold">初級</div>
                </label>
                <label class="qv-level-option flex-grow-1 text-center" :class="{ active: selectedLevel === 'INTERMEDIATE' }">
                  <input type="radio" name="qvLevel" value="INTERMEDIATE" v-model="selectedLevel" class="d-none">
                  <div class="fw-bold">中級</div>
                </label>
                <label class="qv-level-option flex-grow-1 text-center" :class="{ active: selectedLevel === 'ADVANCED' }">
                  <input type="radio" name="qvLevel" value="ADVANCED" v-model="selectedLevel" class="d-none">
                  <div class="fw-bold">高級</div>
                </label>
              </div>

              <div class="form-check mb-1">
                <input class="form-check-input cursor-pointer shadow-sm" type="checkbox" id="quickViewAgree" v-model="isAgreed" style="border-color: #cbd5e1;">
                <label class="form-check-label cursor-pointer text-muted small" for="quickViewAgree" style="line-height: 1.5;">
                  我同意遵守本團長的臨打規範與球館安全
                </label>
              </div>
            </template>

            <template v-else>
              <div class="p-3 bg-light rounded-3 border mb-1">
                <h6 class="fw-bold text-dark mb-2"><i class="bi bi-info-circle-fill me-1 text-mori-teal"></i>行前提醒</h6>
                <ul class="text-secondary small mb-0 ps-3" style="line-height: 1.6;">
                  <li>請提早 10 分鐘抵達球場熱身。</li>
                  <li>若因故無法出席，請務必提早取消，以免影響主揪權益。</li>
                  <li>找不到球場可直接撥打主揪電話。</li>
                </ul>
              </div>
            </template>
          </div>

          <div class="modal-footer border-top-0 px-4 pb-4 pt-2 d-flex gap-2">
            <button type="button" class="btn btn-light fw-bold flex-grow-1 border rounded-pill" @click="goToDetails">
              <i class="bi bi-arrow-right-circle me-1"></i>查看完整詳情
            </button>

            <template v-if="!isQuickViewRegistered">
              <button type="button" class="btn fw-bold text-white shadow-sm flex-grow-1 rounded-pill qv-btn-submit"
                      @click="confirmSignup"
                      :disabled="!isAgreed || quickViewGame?.currentPlayers >= quickViewGame?.maxPlayers">
                {{ quickViewGame?.currentPlayers >= quickViewGame?.maxPlayers ? '已滿團' : '⚡ 確認報名' }}
              </button>
            </template>
            <template v-else>
              <button type="button" class="btn btn-outline-danger fw-bold flex-grow-1 rounded-pill"
                      @click="cancelMySignup">
                <i class="bi bi-x-circle-fill me-1"></i>退出揪團
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ManageMatchModal ref="manageModalRef" :game="managedGame" @refresh-list="fetchGames" />
  <AuthModal v-model="showAuthModal" @login-success="onAuthSuccess" />
</template>
<style scoped>

/* ============================================================
   🎨 森系清新風 (Mori-kei Fresh Style) 核心樣式
   ============================================================ */

/* 輔助類別，用於替換原本的 text-sky-blue 等 */
.text-mori-teal {
  color: #457B9D !important;
}
.bg-mori-teal {
  background-color: #457B9D !important;
}
/* 🌟 漏掉的森系成功綠色補這裡 */
.text-mori-success {
  color: #2A9D8F !important;
}

/* 列表中的卡片樣式 (讓資料列獨立浮起，不被背景干擾) */
.pickup-card {
  background-color: white;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 4px 16px rgba(69, 123, 157, 0.05);
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.pickup-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(69, 123, 157, 0.1);
}

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

/* 輕微懸停背景：使用森系米白 */
.hover-bg-light:hover {
  background-color: #F1FAEE !important;
}
input:focus {
  outline: none;
  box-shadow: none;
}

/* ============================================================
   🍃 森系清新風 - 全景背景羽毛編織壓紋
   ============================================================ */


.container {
  position: relative;
  overflow: hidden;     /* 1：裁切掉超出邊界的羽毛，絕對不讓它蓋到 Footer */
  min-height: 85vh;     /* 2：給頁面基本高度 (畫面高度的 85%)，把 Footer 往下推 */
}


.feather-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.feather-item {
  position: absolute;
  user-select: none;

}




/* 3. 確保主要元件在背景紋理之上 */
.pickup-card,
.rounded-pill.p-1.bg-light,
.bg-white.shadow-sm,
button,
nav {
  position: relative;
  z-index: 1;                  /* 確保在紋理上面 */
}


/* ============================
   🌟 Quick View Modal 樣式
   ============================ */

/* 資訊卡背景 - 改用純白背景配細微發光陰影，提升高級感 */
.qv-info-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(69, 123, 157, 0.05);
  border: none;
}

/* 程度徽章 - 使用更柔和的淺灰色 */
.qv-badge-level {
  background-color: #F8FAFC;
  color: #64748B;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 4px;
  padding: 3px 8px;
  border: none;
}

/* 性別徽章 - 保持溫和 */
.qv-badge-female {
  background-color: #fce4ec !important;
  color: #d81b60 !important;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid #f48fb1 !important;
  border-radius: 4px;
  padding: 3px 8px;
}
.qv-badge-male {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid #90caf9 !important;
  border-radius: 4px;
  padding: 3px 8px;
}
.qv-badge-all {
  background-color: #f1f5f9 !important;
  color: #64748b !important;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid #e2e8f0 !important;
  border-radius: 4px;
  padding: 3px 8px;
}

/* 揪團標籤 - 使用森系溫和米綠色 */
.qv-tag {
  background-color: #F1FAEE;
  color: #457B9D;
  font-size: 0.68rem;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
}

/* 進度條品牌色 - 使用森之藍綠 */
.bg-sky-blue-bar {
  background-color: #457B9D !important;
}

/* 程度選擇器 (橫排按鈕) */
.qv-level-option {
  cursor: pointer;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 12px 10px;
  font-size: 0.85rem;
  color: #64748B;
  background-color: #fff;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
}

/* 懸停：使用森系米綠色強調 */
.qv-level-option:hover {
  border-color: #457B9D;
  color: #457B9D;
  background-color: #F1FAEE;
}

/* 激活：使用森系藍綠色實心填充，白色文字 */
.qv-level-option.active {
  border-color: #457B9D;
  background-color: #457B9D;
  color: #fff;
  box-shadow: 0 4px 12px rgba(69, 123, 157, 0.2);
}

/* 確認報名按鈕 - 實心森之藍綠 */
.qv-btn-submit {
  background-color: #457B9D;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

/* 按鈕懸停：添加上升感和發光效果 */
.qv-btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(69, 123, 157, 0.3);
}

/* 按鈕禁用狀態 */
.qv-btn-submit:disabled {
  background-color: #CBD5E1;
  color: #fff;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}
</style>
