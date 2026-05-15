import { ref } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'

/**
 * 🔌 揪團 API Composable
 * =====================
 * 把所有跟後端 API 溝通的邏輯集中在這裡管理。
 *
 * 【為什麼要這樣拆？】
 * 1. 如果後端的 API 網址改了（例如 /api/v2/pickup-games），只需要改這一支檔案。
 * 2. 讓主頁面 (.vue) 不再看到任何 axios.get / axios.post，畫面邏輯更乾淨。
 * 3. 前台的「我的揪團」頁面如果也需要呼叫同樣的 API，可以直接 import 這支檔案複用。
 *
 * 【使用方式】
 * 在 .vue 檔案中：
 *   import { usePickupGameApi } from '@/composables/usePickupGameApi'
 *   const { pickupGames, courts, fetchGames, ... } = usePickupGameApi()
 */
export function usePickupGameApi() {

  // ============================
  // 📋 響應式資料（由 API 填充）
  // ============================
  const pickupGames = ref([])          // 揪團列表
  const courts = ref([])               // 場地列表（給下拉選單用）
  const signupsMap = ref({})           // 每場揪團的報名名單，key = gameId

  // 新增揪團表單相關
  const memberKeyword = ref('')        // 搜尋主揪的關鍵字
  const memberResults = ref([])        // 搜尋主揪的結果
  const selectedMember = ref(null)     // 選中的主揪

  // 報名區搜尋相關（跟新增揪團的搜尋分開，避免互相干擾）
  const signupKeyword = ref('')
  const signupSearchResults = ref([])
  const selectedSignupMember = ref(null)

  // 🌟 主揪的可用預約清單（選完主揪後載入）
  const memberBookings = ref([])
  const selectedBookingId = ref(null)

  // 編輯揪團相關
  const editGame = ref(null)           // 正在編輯的揪團資料（深拷貝）
  const editMemberKeyword = ref('')    // 編輯表單裡主揪的顯示文字

  // 新增揪團的表單預設值
  const today = new Date().toISOString().split('T')[0]
  const newGame = ref({
    host: { memberId: null },
    court: { courtId: null },
    gameDate: '',
    startTime: '',
    endTime: '',
    maxPlayers: 4,
    skillLevel: 'ALL',
    requiredGender: 'ALL',
  })

  // ============================
  // 🔌 GET：抓取揪團列表
  // ============================
  const fetchGames = async () => {
    try {
      const response = await axios.get('/api/pickup-games')
      pickupGames.value = response.data
    } catch (error) {
      console.log('抓取資料失敗', error)
    }
  }

  // ============================
  // 🔌 GET：抓取場地列表（給下拉選單）
  // ============================
  const fetchCourts = async () => {
    try {
      const res = await axios.get('/api/courts')
      courts.value = res.data
    } catch (err) {
      console.error('抓取場地失敗', err)
    }
  }

  // ============================
  // 🔍 GET：搜尋會員（新增揪團用）
  // ============================
  const searchMembers = async () => {
    if (!memberKeyword.value.trim()) {
      memberResults.value = []
      return
    }
    try {
      const res = await axios.get('/api/members/search', {
        params: { keyword: memberKeyword.value },
      })
      memberResults.value = res.data
    } catch (err) {
      console.error('搜尋會員失敗', err)
    }
  }

  // 選中會員後：填入表單 + 載入該會員的可用預約
  const selectMember = (member) => {
    selectedMember.value = member
    newGame.value.host.memberId = member.memberId
    memberKeyword.value = member.fullName
    memberResults.value = []
    // 🌟 選完主揪後，自動載入該主揪的可用預約
    selectedBookingId.value = null
    fetchMemberBookings(member.memberId)
  }

  // ============================
  // 🔌 GET：抓取指定會員的可用預約（未過期、已確認、尚未綁定揪團）
  // ============================
  const fetchMemberBookings = async (memberId) => {
    try {
      // 🌟 同時撈取所有預約 + 所有揪團（用於排除已被使用的預約）
      const [bookingsRes, gamesRes] = await Promise.all([
        axios.get('/api/bookings'),
        axios.get('/api/pickup-games'),
      ])
      const allBookings = bookingsRes.data
      const allGames = gamesRes.data
      const todayStr = new Date().toISOString().split('T')[0]

      // 🌟 找出已經被揪團綁定的 bookingId（排除已取消的揪團）
      const usedBookingIds = new Set(
        allGames
          .filter(g => g.bookingId && g.status !== 'CANCELLED')
          .map(g => g.bookingId)
      )

      // 篩選條件：該會員 + 已確認 + 日期未過期 + 尚未被揪團使用 + 時間未過
      const now = new Date()
      memberBookings.value = allBookings
        .filter(b => {
          if (b.member?.memberId !== memberId) return false
          if (b.status !== 'CONFIRMED') return false
          if (b.bookingDate < todayStr) return false
          if (usedBookingIds.has(b.bookingId)) return false
          // 🌟 今天的預約：開始時間已過就不能再拿來開團
          if (b.bookingDate === todayStr && b.startTime) {
            const startDt = new Date(`${b.bookingDate}T${b.startTime}`)
            if (startDt <= now) return false
          }
          return true
        })
        .map(b => ({
          bookingId: b.bookingId,
          courtId: b.court?.courtId,
          venueName: b.court?.venue?.venueName || '未指定場館',
          courtName: b.court?.courtName || '未指定場地',
          bookingDate: b.bookingDate,
          startTime: b.startTime,
          endTime: b.endTime,
        }))
    } catch (err) {
      console.error('抓取會員預約失敗', err)
      memberBookings.value = []
    }
  }

  // 🌟 選擇預約後：自動帶入場地、日期、時間
  const selectAdminBooking = (bookingId) => {
    const b = memberBookings.value.find(x => x.bookingId === bookingId)
    if (b) {
      selectedBookingId.value = b.bookingId
      newGame.value.bookingId = b.bookingId
      newGame.value.court.courtId = b.courtId
      newGame.value.gameDate = b.bookingDate
      newGame.value.startTime = b.startTime
      newGame.value.endTime = b.endTime
      // 暫存場地名稱供顯示用
      newGame.value._venueName = b.venueName
      newGame.value._courtName = b.courtName
    }
  }

  // ============================
  // ➕ POST：新增揪團
  // ============================
  const createPickupGame = async () => {
    try {
      // 🌟 送出前清理：移除前端暫存的顯示用欄位（後端 Entity 不認識這些）
      const payload = { ...newGame.value }
      delete payload.venueName
      delete payload.courtName
      delete payload._venueName
      delete payload._courtName
      await axios.post('/api/pickup-games', payload)
      Swal.fire({
        icon: 'success',
        title: '建立成功！',
        text: '揪團已成功建立',
        confirmButtonText: '太好了',
        confirmButtonColor: '#0d6efd',
      })
      fetchGames()
      // 重置表單
      newGame.value = {
        host: { memberId: null },
        court: { courtId: null },
        gameDate: '',
        startTime: '',
        endTime: '',
        maxPlayers: 4,
        skillLevel: 'ALL',
        requiredGender: 'ALL',
        bookingId: null,
      }
      selectedMember.value = null
      memberKeyword.value = ''
      memberBookings.value = []
      selectedBookingId.value = null
    } catch (error) {
      console.error('新增失敗：', error)
      Swal.fire({
        icon: 'error',
        title: '新增失敗',
        text: '請檢查資料是否正確',
        confirmButtonText: '我知道了',
      })
    }
  }

  // ============================
  // ✏️ 編輯揪團相關
  // ============================
  // 點擊鉛筆按鈕 → 深拷貝資料進 editGame
  const openEditModal = (game) => {
    editGame.value = JSON.parse(JSON.stringify(game))
    editMemberKeyword.value = game.host?.fullName || ''
  }

  // PUT：儲存編輯
  const updatePickupGame = async () => {
    try {
      await axios.put(`/api/pickup-games/${editGame.value.gameId}`, editGame.value)
      Swal.fire({
        icon: 'success',
        title: '修改成功！',
        confirmButtonText: '太好了',
        confirmButtonColor: '#0d6efd',
      })
      fetchGames()
    } catch (error) {
      console.error('修改失敗', error)
      Swal.fire({
        icon: 'error',
        title: '修改失敗',
        text: '請檢查資料',
        confirmButtonText: '我知道了',
      })
    }
  }

  // ============================
  // 🗑️ 取消揪團（軟刪除）
  // ============================
  const cancelPickupGame = async (game) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '確定要取消這場揪團嗎？',
      text: `${game.host?.fullName} 在 ${game.gameDate} 的揪團將被標記為「已取消」`,
      showCancelButton: true,
      confirmButtonText: '確定取消',
      cancelButtonText: '返回',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
    })
    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('memberToken');
        await axios.put(`/api/pickup-games/${game.gameId}`, {
          ...game,
          status: 'CANCELLED',
        }, {
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          }
        })
        Swal.fire({
          icon: 'success',
          title: '已取消',
          text: '該揪團已標記為已取消',
          confirmButtonText: '好的',
          confirmButtonColor: '#0d6efd',
        })
        fetchGames()
      } catch (err) {
        console.error('取消失敗', err)
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || '未知錯誤';
        Swal.fire({ icon: 'error', title: '取消失敗', text: errMsg, confirmButtonText: '我知道了' })
      }
    }
  }

  // ============================
  // ☑️ 批次取消揪團
  // ============================
  const batchCancel = async (selectedIds) => {
    if (!selectedIds.length) return
    const result = await Swal.fire({
      icon: 'warning',
      title: `確定要批次取消 ${selectedIds.length} 場揪團嗎？`,
      showCancelButton: true,
      confirmButtonText: '確定取消',
      cancelButtonText: '返回',
      confirmButtonColor: '#dc3545',
    })
    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('memberToken');
        await Promise.all(
          selectedIds.map((id) => {
            const game = pickupGames.value.find((g) => g.gameId === id)
            return axios.put(`/api/pickup-games/${id}`, { ...game, status: 'CANCELLED' }, {
              headers: { Authorization: token ? `Bearer ${token}` : '' }
            })
          }),
        )
        Swal.fire({ icon: 'success', title: `已取消 ${selectedIds.length} 場揪團` })
        fetchGames()
        return true // 回傳 true 讓呼叫端知道成功了，可以清空 selectedIds
      } catch (err) {
        Swal.fire({ icon: 'error', title: '批次取消失敗' })
        return false
      }
    }
    return false
  }

  // ============================
  // 👥 報名相關 API
  // ============================
  // 抓取某場揪團的報名名單
  const fetchSignups = async (gameId) => {
    try {
      const res = await axios.get(`/api/pickup-games/${gameId}/signups`)
      signupsMap.value[gameId] = res.data
    } catch (err) {
      console.error('抓取報名名單失敗', err)
    }
  }

  // 搜尋會員（報名區用，跟新增揪團的搜尋分開）
  const searchSignupMembers = async () => {
    if (!signupKeyword.value.trim()) {
      signupSearchResults.value = []
      return
    }
    try {
      const res = await axios.get('/api/members/search', {
        params: { keyword: signupKeyword.value },
      })
      signupSearchResults.value = res.data
    } catch (err) {
      console.error('搜尋會員失敗', err)
    }
  }

  // 選中報名區的會員
  const selectSignupMember = (member) => {
    selectedSignupMember.value = member
    signupKeyword.value = member.fullName
    signupSearchResults.value = []
  }

  // 新增報名
  const addSignup = async (gameId) => {
    if (!selectedSignupMember.value) {
      Swal.fire({ icon: 'warning', title: '請先搜尋並選擇一位會員', confirmButtonText: '好的' })
      return
    }

    // 🌟 後台代報名性別防呆檢查 (改為軟性警告，允許強制報名)
    const game = pickupGames.value.find(g => g.gameId === gameId)
    if (game) {
      const reqGender = game.requiredGender || game.genderLimit
      const memberGender = selectedSignupMember.value.gender
      let isConflict = false;
      let conflictMsg = '';
      
      if (reqGender === 'FEMALE' && memberGender !== 'FEMALE' && memberGender !== '女') {
        isConflict = true;
        conflictMsg = '本場次為主揪設定之「女性專屬場次」，但您選擇的會員為男性。';
      } else if (reqGender === 'MALE' && memberGender !== 'MALE' && memberGender !== '男') {
        isConflict = true;
        conflictMsg = '本場次為主揪設定之「男性專屬場次」，但您選擇的會員為女性。';
      }

      if (isConflict) {
        const result = await Swal.fire({
          icon: 'warning',
          title: '性別條件衝突',
          text: `${conflictMsg} 管理員可不受限制，是否要強制報名？`,
          showCancelButton: true,
          confirmButtonText: '是，強制報名',
          cancelButtonText: '取消',
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d',
        });
        
        if (!result.isConfirmed) {
          return;
        }
      }
    }

    try {
      await axios.post('/api/pickup-game-signups', {
        game: { gameId: gameId },
        member: { memberId: selectedSignupMember.value.memberId },
      })
      Swal.fire({
        icon: 'success',
        title: '報名成功！',
        text: `${selectedSignupMember.value.fullName} 已加入揪團`,
        confirmButtonText: '太好了',
        confirmButtonColor: '#0d6efd',
      })
      await fetchSignups(gameId)
      fetchGames()
      signupKeyword.value = ''
      selectedSignupMember.value = null
    } catch (error) {
      console.error('報名失敗', error)
      Swal.fire({
        icon: 'error',
        title: '報名失敗',
        text: '該會員可能已經報名過了',
        confirmButtonText: '我知道了',
      })
    }
  }
  // ============================
  // 🚀 前台專用：加入臨打報名
  // ============================
  const joinPickupGame = async (gameId, currentMemberId) => {
    try {
      // 呼叫你的後端 API，傳入場次 ID 跟 當前登入的會員 ID
      await axios.post('/api/pickup-game-signups', {
        game: { gameId: gameId },
        member: { memberId: currentMemberId },
      })

      Swal.fire({
        icon: 'success',
        title: '報名成功！',
        text: '請準時前往場館報到！',
        confirmButtonColor: '#0ea5e9',
        confirmButtonText: '太棒了'
      })

      // 報名成功後，重新去後端抓最新資料，讓畫面上的人數進度條馬上加一！
      fetchGames()

    } catch (error) {
      console.error('前台報名失敗', error)
      Swal.fire({
        icon: 'error',
        title: '報名失敗',
        text: '您可能已經報名過了，或是名額剛剛被搶光囉！',
        confirmButtonText: '我知道了'
      })
    }
  }

  // 移除報名
  const removeSignup = async (signupId, gameId, memberName) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '確定移除報名嗎？',
      text: `即將移除「${memberName}」的報名`,
      showCancelButton: true,
      confirmButtonText: '確定移除',
      cancelButtonText: '取消',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
    })
    if (result.isConfirmed) {
      try {
        await axios.delete(`/api/pickup-game-signups/${signupId}`)
        Swal.fire({
          icon: 'success',
          title: '已移除',
          text: `${memberName} 的報名已被移除`,
          confirmButtonText: '好的',
          confirmButtonColor: '#0d6efd',
        })
        await fetchSignups(gameId)
        fetchGames()
      } catch (err) {
        console.error('移除失敗', err)
        Swal.fire({ icon: 'error', title: '移除失敗', confirmButtonText: '我知道了' })
      }
    }
  }

  // ============================
  // ✏️ 即時編輯（Inline Edit）
  // ============================
  const inlineEdit = ref(null)

  const startInlineEdit = (gameId, field) => {
    inlineEdit.value = { gameId, field }
  }

  const saveInlineEdit = async (game) => {
    try {
      await axios.put(`/api/pickup-games/${game.gameId}`, game)
      inlineEdit.value = null
      fetchGames()
    } catch (err) {
      Swal.fire({ icon: 'error', title: '更新失敗' })
    }
  }

  // ============================
  // 📦 回傳所有東西給外部使用
  // ============================
  return {
    // 響應式資料
    pickupGames,
    courts,
    signupsMap,
    memberKeyword,
    memberResults,
    selectedMember,
    signupKeyword,
    signupSearchResults,
    selectedSignupMember,
    editGame,
    editMemberKeyword,
    newGame,
    today,
    inlineEdit,
    joinPickupGame,
    memberBookings,       // 🌟 主揪的可用預約清單
    selectedBookingId,    // 🌟 選中的預約 ID

    // API 方法
    fetchGames,
    fetchCourts,
    searchMembers,
    selectMember,
    createPickupGame,
    openEditModal,
    updatePickupGame,
    cancelPickupGame,
    batchCancel,
    fetchSignups,
    searchSignupMembers,
    selectSignupMember,
    addSignup,
    removeSignup,
    startInlineEdit,
    saveInlineEdit,
    fetchMemberBookings,  // 🌟 抓取會員預約
    selectAdminBooking,   // 🌟 選擇預約後帶入資料
  }
}
