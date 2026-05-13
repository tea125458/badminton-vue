import { ref, computed, watch } from 'vue'

/**
 * 🔍 揪團篩選 + 排序 + 分頁 Composable
 * ====================================
 * 把「資料怎麼篩、怎麼排、怎麼分頁」的運算邏輯抽出來。
 *
 * 【為什麼要這樣拆？】
 * 1. 篩選邏輯通常是最容易出 Bug 的地方（尤其是多層篩選），獨立出來比較好 debug。
 * 2. 前台的「揪團列表」如果也需要搜尋 + 分頁，可以直接複用。
 *
 * 【使用方式】
 * 在 .vue 裡：
 *   const { filteredGames, paginatedGames, ... } = useGameFilter(pickupGames, getDisplayStatus)
 *   // pickupGames 是從 usePickupGameApi 拿到的 ref
 *   // getDisplayStatus 是判斷過期狀態的 function
 *
 * 【設計重點】
 * - 接收外部傳入的 pickupGames (ref) 和 getDisplayStatus (function)
 * - 內部自己管理 searchQuery, statusFilter, sortBy, currentPage 等 UI 狀態
 * - dateFrom / dateTo 從外部的 useDateFilter 傳入
 */
export function useGameFilter(pickupGames, getDisplayStatus, dateFrom, dateTo) {

  // ============================
  // 🔍 搜尋 & 篩選狀態
  // ============================
  const searchQuery = ref('')      // 搜尋關鍵字
  const statusFilter = ref('ALL') // 狀態篩選（ALL / OPEN / FULL / CLOSED / CANCELLED）
  const sortBy = ref('default')   // 排序方式
  const currentPage = ref(1)      // 目前頁碼
  const pageSize = ref(10)        // 每頁筆數

  // ============================
  // ☑️ 批次勾選
  // ============================
  const selectedIds = ref([])

  const toggleSelectAll = (event) => {
    if (event.target.checked) {
      selectedIds.value = paginatedGames.value.map((g) => g.gameId)
    } else {
      selectedIds.value = []
    }
  }

  // ============================
  // 展開/收合報名名單
  // ============================
  const expandedGameId = ref(null)

  const toggleSignups = async (gameId, fetchSignupsFn) => {
    if (expandedGameId.value === gameId) {
      expandedGameId.value = null
      return
    }
    expandedGameId.value = gameId
    await fetchSignupsFn(gameId)
  }

  // ============================
  // 🔄 重新整理（重置所有篩選）
  // ============================
  const isRefreshing = ref(false)

  const refreshGames = async (fetchGamesFn, datePresetLabel) => {
    isRefreshing.value = true
    searchQuery.value = ''
    statusFilter.value = 'ALL'
    dateFrom.value = ''
    dateTo.value = ''
    sortBy.value = 'default'
    datePresetLabel.value = '全部日期'
    currentPage.value = 1
    await fetchGamesFn()
    setTimeout(() => {
      isRefreshing.value = false
    }, 500)
  }

  // ============================
  // 🧮 第一層篩選：日期 + 搜尋
  // （不含狀態，讓狀態按鈕的計數能跟日期連動）
  // ============================
  const dateFilteredGames = computed(() => {
    let result = pickupGames.value
    // 日期區間
    if (dateFrom.value) {
      result = result.filter((game) => game.gameDate >= dateFrom.value)
    }
    if (dateTo.value) {
      result = result.filter((game) => game.gameDate <= dateTo.value)
    }
    // 搜尋關鍵字
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      result = result.filter((game) => {
        const searchable = [
          game.host?.fullName,
          game.host?.phone,
          game.venue?.venueName,
          game.court?.courtName,
          game.gameDate,
          String(game.gameId),
        ]
          .join(' ')
          .toLowerCase()
        return searchable.includes(q)
      })
    }
    return result
  })

  // ============================
  // 🧮 第二層篩選：狀態 + 排序
  // ============================
  const filteredGames = computed(() => {
    let result = dateFilteredGames.value
    if (statusFilter.value !== 'ALL') {
      result = result.filter((game) => getDisplayStatus(game) === statusFilter.value)
    }
    // 排序
    if (sortBy.value === 'dateNewest') {
      result = [...result].sort((a, b) => b.gameDate.localeCompare(a.gameDate))
    } else if (sortBy.value === 'dateOldest') {
      result = [...result].sort((a, b) => a.gameDate.localeCompare(b.gameDate))
    } else if (sortBy.value === 'playersMost') {
      result = [...result].sort((a, b) => b.currentPlayers - a.currentPlayers)
    } else if (sortBy.value === 'playersLeast') {
      result = [...result].sort((a, b) => a.currentPlayers - b.currentPlayers)
    }
    return result
  })

  // ============================
  // 📄 分頁
  // ============================
  const totalPages = computed(() => {
    return Math.ceil(filteredGames.value.length / pageSize.value) || 1
  })

  const paginatedGames = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredGames.value.slice(start, start + pageSize.value)
  })

  // 任何篩選條件改變時，自動回到第一頁
  watch([searchQuery, statusFilter, pageSize, dateFrom, dateTo, sortBy], () => {
    currentPage.value = 1
  })

  // ============================
  // 📦 回傳
  // ============================
  return {
    searchQuery,
    statusFilter,
    sortBy,
    currentPage,
    pageSize,
    selectedIds,
    expandedGameId,
    isRefreshing,
    toggleSelectAll,
    toggleSignups,
    refreshGames,
    dateFilteredGames,
    filteredGames,
    totalPages,
    paginatedGames,
  }
}
