<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePickupGameApi } from '@/composables/usePickupGameApi'
import { useTimeConflict } from '@/composables/useTimeConflict'
import SignupPanel from '@/components/frontend/SignupPanel.vue'
import GoogleMap from '@/components/common/GoogleMap.vue'
import Swal from 'sweetalert2'
import { useMemberStore } from '@/stores/member'
import AuthModal from '@/components/frontend/AuthModal.vue'

const route = useRoute()
const router = useRouter()
const gameId = route.params.id

const { pickupGames, fetchGames, signupsMap, fetchSignups, joinPickupGame, removeSignup } = usePickupGameApi()
const memberStore = useMemberStore()
const showAuthModal = ref(false)
const { checkTimeConflict } = useTimeConflict()

const isLoaded = ref(false)
const isJoining = ref(false)

// 🪶 羽毛背景隨機資料
const cols = 4
const rows = 4
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
  { x: 30, y: 42, size: 185, opacity: 0.30, rotate: 210 },
  { x: 55, y: 48, size: 195, opacity: 0.30, rotate: 330 },
  { x: 45, y: 68, size: 175, opacity: 0.30, rotate: 80  },
  { x: 68, y: 50, size: 200, opacity: 0.30, rotate: 145 },
]

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    feathers.push({
      x: (col / cols) * 95 + Math.random() * (95 / cols),
      y: (row / rows) * 60 + Math.random() * (60 / rows),
      size: 70 + Math.random() * 70,
      opacity: 0.08 + Math.random() * 0.05,
      rotate: Math.random() * 360
    })
  }
}


const skillMap = {
  ALL: '不限',
  BEGINNER: '初級',
  INTERMEDIATE: '中級',
  ADVANCED: '高級',
}

onMounted(async () => {
  await Promise.all([
    fetchGames(),
    fetchSignups(gameId)
  ])
  isLoaded.value = true
})

const game = computed(() => {
  return pickupGames.value.find(g => String(g.gameId) === String(gameId))
})

const signups = computed(() => {
  return signupsMap.value[gameId] || []
})

// ============================
// 🎯 核心商業邏輯：報名權限判定
// ============================
const currentMemberId = computed(() => memberStore.memberId)

const isCurrentUserHost = computed(() => {
  if (!game.value || !game.value.host) return false
  return String(game.value.host?.memberId) === String(currentMemberId.value)
})

const mySignupCount = computed(() => {
  if (!signups.value) return 0
  return signups.value.filter(s => String(s.member?.memberId) === String(currentMemberId.value)).length
})

const signupButtonText = computed(() => {
  if (game.value?.currentPlayers >= game.value?.maxPlayers) return '已額滿'
  if (mySignupCount.value === 0) return '我要報名'
  if (isCurrentUserHost.value) return '再幫朋友卡一位 (+1)'
  return '您已報名'
})

const isButtonDisabled = computed(() => {
  if (!game.value) return true
  if (game.value.currentPlayers >= game.value.maxPlayers) return true
  if (mySignupCount.value > 0 && !isCurrentUserHost.value) return true
  return false
})
// 1. 新增一個判斷：當前使用者是否為「已報名的普通成員」（排除主揪）
const isAlreadyJoined = computed(() => {
  return mySignupCount.value > 0 && !isCurrentUserHost.value
})

// 2. 新增退出揪團的方法
const onCancelGame = async () => {
  // 從名單中找出自己的報名紀錄 ID
  const mySignup = signups.value.find(s => String(s.member?.memberId) === String(currentMemberId.value))
  if (!mySignup) return

  // 彈出 SweetAlert 再次確認，避免誤點
  const result = await Swal.fire({
    icon: 'warning',
    title: '確定要退出揪團嗎？',
    text: '退出後若想再次參加，需要重新報名喔！',
    showCancelButton: true,
    confirmButtonText: '確定退出',
    cancelButtonText: '暫不退出',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
  })

  if (result.isConfirmed) {
    // 這裡我們直接呼叫你原本寫好的 removeSignup API (與踢除成員共用同一支後端)
    await removeSignup(mySignup.signupId, gameId, mySignup.member?.fullName)

    // 重新抓取資料更新畫面
    await Promise.all([
      fetchGames(),
      fetchSignups(gameId)
    ])

    Swal.fire({
      icon: 'success',
      title: '已退出揪團',
      text: '期待您下次再一起打球！',
      confirmButtonColor: '#457B9D'
    })
  }
}

// ============================
// 💰 動態費用計算邏輯
// ============================
// const calculatedFeePerPerson = computed(() => {
//   if (!game.value || !game.value.startTime || !game.value.endTime || !game.value.maxPlayers) return 0

//   // 將 "14:00" 轉成數字 14.0
//   const parseTime = (timeStr) => {
//     const [hours, minutes] = timeStr.split(':').map(Number)
//     return hours + (minutes / 60)
//   }

//   const startHours = parseTime(game.value.startTime)
//   const endHours = parseTime(game.value.endTime)
//   const duration = Math.max(0, endHours - startHours)

//   // 總場地費：每小時 300 元
//   const totalCost = duration * 300

//   // 每人單價：總費用 / 人數上限 (使用 Math.ceil 無條件進位)
//   return Math.ceil(totalCost / (game.value.currentPlayers || 1))
// })

// ============================
// 🎯 視覺處理：報名名單顯示標籤
// ============================
const displaySignups = computed(() => {
  if (!signups.value || !game.value) return []
  const memberCounts = {}

  return signups.value.map((signup) => {
    const mId = signup.member?.memberId
    const isHost = (String(mId) === String(game.value.host?.memberId))

    if (!memberCounts[mId]) {
      memberCounts[mId] = 1
    } else {
      memberCounts[mId]++
    }

    const count = memberCounts[mId]
    let tag = ''

    if (count === 1 && isHost) {
      tag = '主揪'
    } else if (count > 1) {
      tag = `攜伴 +${count - 1}`
    }

    return { ...signup, displayTag: tag }
  })
})

/* const onJoinGame = async (payload) => {


  if (isButtonDisabled.value) return

  const memberInfo = JSON.parse(localStorage.getItem('memberInfo')) || {}
  const reqGender = game.value?.requiredGender || game.value?.genderLimit

  if (reqGender === 'FEMALE' && memberInfo.gender !== 'FEMALE' && memberInfo.gender !== '女') {
    Swal.fire({
      icon: 'error',
      title: '資格不符',
      text: '不好意思，本場次為主揪設定之女性專屬場次喔！',
      confirmButtonColor: '#ec4899',
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

  isJoining.value = true
  await joinPickupGame(gameId, currentMemberId)

  await Promise.all([
    fetchGames(),
    fetchSignups(gameId)
  ])
  isJoining.value = false
}
 */

 const onJoinGame = async (payload) => {
  if (!memberStore.isLoggedIn) {
    showAuthModal.value = true
    return
  }

  if (isButtonDisabled.value) return

  const memberInfo = memberStore.memberInfo || {}
  const reqGender = game.value?.requiredGender || game.value?.genderLimit

  // 性別防呆
  if (reqGender === 'FEMALE' && memberInfo.gender !== 'FEMALE' && memberInfo.gender !== '女') {
    Swal.fire({
      icon: 'error',
      title: '資格不符',
      text: '不好意思，本場次為主揪設定之女性專屬場次喔！',
      confirmButtonColor: '#ec4899',
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
  const levelRank = { '初級': 1, '中級': 2, '高級': 3 }
  const reqLevel = game.value?.skillLevel
  const levelCodeToName = { BEGINNER: '初級', INTERMEDIATE: '中級', ADVANCED: '高級' }
  const reqLevelName = levelCodeToName[reqLevel]
  const selectedLevelName = payload.level  // SignupPanel emit 出來的是 '初級' / '中級' / '高級'

  if (reqLevel && reqLevel !== 'ALL' && levelRank[selectedLevelName] < levelRank[reqLevelName]) {
    Swal.fire({
      icon: 'error',
      title: '程度不符',
      text: `本場次最低程度要求為「${reqLevelName}」，您選擇的「${selectedLevelName}」不符合資格！`,
      confirmButtonColor: '#0ea5e9',
      confirmButtonText: '我知道了'
    })
    return
  }

  // 🕐 時間衝突檢查
  const { hasConflict, conflictMessage } = await checkTimeConflict(
    currentMemberId.value,
    game.value.gameDate,
    game.value.startTime,
    game.value.endTime,
    { excludeGameId: Number(gameId) }
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

  isJoining.value = true
  await joinPickupGame(gameId, currentMemberId.value)

  await Promise.all([
    fetchGames(),
    fetchSignups(gameId)
  ])
  isJoining.value = false
}

function onAuthSuccess() {
  showAuthModal.value = false
  Promise.all([
    fetchGames(),
    fetchSignups(gameId)
  ])
}


 // 主揪踢除成員功能
// 主揪踢除成員功能
const handleKick = async (signupId, memberName) => {
  await removeSignup(signupId, gameId, memberName)
  await Promise.all([
    fetchGames(),
    fetchSignups(gameId)
  ])
}

</script>

<template>
  <div class="page-bg position-relative overflow-hidden"> <div class="feather-bg" aria-hidden="true">
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

    <div v-if="!isLoaded" class="vh-100 d-flex align-items-center justify-content-center">
      <div class="spinner-border text-mori-teal" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else-if="!game" class="vh-100 d-flex flex-column align-items-center justify-content-center">
      <i class="bi bi-emoji-frown fs-1 text-secondary mb-3"></i>
      <h4 class="text-secondary mb-4">找不到該筆揪團紀錄</h4>
      <button class="btn btn-outline-secondary rounded-pill px-4" @click="router.push('/pickup')">回揪團列表</button>
    </div>

    <div v-else class="content-wrapper pb-5">

      <div class="hero-banner position-relative" style="background-image: url('/banner_c.jpg'); background-size: cover; background-position: center; height: 350px;">
        <div class="position-absolute w-100 h-100 top-0 start-0" style="background: linear-gradient(to right, rgba(30, 60, 80, 0.85) 0%, rgba(30, 60, 80, 0.2) 100%); backdrop-filter: blur(3px);"></div>

        <div class="container position-relative h-100 d-flex align-items-center">
          <div class="w-100 text-white z-3">
            <div class="d-flex gap-2 mb-3">
              <span class="badge rounded-pill glass-badge px-3 py-2 fw-medium">
                <i class="bi bi-trophy-fill text-warning me-1"></i> {{ skillMap[game.skillLevel] }}
              </span>
              <span class="badge rounded-pill glass-badge px-3 py-2 fw-medium">
                <i class="bi bi-circle-fill text-success me-1" style="font-size: 8px;"></i> 報名中
              </span>
            </div>
            <h1 class="fw-bold display-4 mb-3">{{ game.court?.venue?.venueName || '羽過天晴' }} 臨打團</h1>
            <div class="d-flex flex-wrap gap-4 text-light opacity-75">
              <div class="d-flex align-items-center fs-5"><i class="bi bi-calendar-event me-2 text-mori-teal-light"></i> {{ game.gameDate }}</div>
              <div class="d-flex align-items-center fs-5"><i class="bi bi-clock me-2 text-mori-teal-light"></i> {{ game.startTime }} - {{ game.endTime }}</div>
              <div class="d-flex align-items-center fs-5"><i class="bi bi-geo-alt-fill me-2 text-mori-teal-light"></i> {{ game.court?.venue?.venueName || '羽球館' }} - {{ game.court?.courtName }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="container main-content position-relative z-3">
        <div class="row g-4 g-lg-5">

          <div class="col-lg-8">

            <div class="card border-0 shadow-sm rounded-4 mb-4">
              <div class="card-body p-4 p-md-5 d-flex align-items-start position-relative overflow-hidden">
                <div class="host-badge position-absolute top-0 end-0 bg-mori-teal text-white px-3 py-1 fw-bold rounded-bottom-start shadow-sm">
                  主揪發起
                </div>
                <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center me-4 flex-shrink-0 shadow-sm" style="width: 75px; height: 75px; font-size: 2rem;">
                  {{ game.host?.fullName?.charAt(0) }}
                </div>
                <div class="pe-4">
                  <h5 class="fw-bold mb-2 d-flex align-items-center">
  {{ game.host?.fullName }}

  <a v-if="isAlreadyJoined && game.host?.phone"
     :href="`tel:${game.host?.phone}`"
     class="ms-3 badge bg-mori-success text-white text-decoration-none px-2 py-1 shadow-sm transition-all"
     style="font-size: 0.85rem; letter-spacing: 0.5px;">
    <i class="bi bi-telephone-fill me-1"></i> {{ game.host?.phone }}
  </a>
</h5>
                  <p class="text-secondary mb-0" style="line-height: 1.8;">
                    哈囉！我是這場臨打的主揪。本次揪團程度要求為「<strong class="text-dark">{{ skillMap[game.skillLevel] }}</strong>」。
                    我們準備了高品質的比賽用球，現場氣氛輕鬆愉快，歡迎熱愛羽球的球友報名參加，一起流汗！
                  </p>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4 mb-4">
              <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <h4 class="fw-bold mb-0"><i class="bi bi-people-fill text-mori-teal me-2"></i>已報名隊友</h4>
                  <span class="badge bg-light text-secondary border fs-6 rounded-pill px-3 py-2">{{ game.currentPlayers }} / {{ game.maxPlayers }} 人</span>
                </div>

                <div class="d-flex flex-wrap gap-4 pt-2">
                  <div v-for="s in displaySignups" :key="s.signupId" class="text-center position-relative player-avatar-wrapper" style="width: 80px;">
                    <button
                      v-if="isCurrentUserHost && s.displayTag !== '主揪' && game.status !== 'CANCELLED' && new Date(`${game.gameDate}T${game.endTime}`) >= new Date()"
                      @click="handleKick(s.signupId, s.member?.fullName)"
                      class="btn btn-mori-coral btn-sm rounded-circle position-absolute shadow kick-btn text-white"
                      title="踢除此成員"
                    >
                      <i class="bi bi-x"></i>
                    </button>

                    <div class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-2 position-relative shadow-sm player-avatar"
                         :class="s.displayTag === '主揪' ? 'bg-mori-teal' : 'bg-secondary'">
                      {{ s.member?.fullName?.charAt(0) || '無' }}
                      <span class="position-absolute bottom-0 end-0 p-1 bg-mori-success border border-2 border-white rounded-circle" style="margin-bottom: 2px; margin-right: 2px;"></span>
                    </div>

                    <div class="small fw-bold text-truncate w-100 text-dark">{{ s.member?.fullName }}</div>
                    <div v-if="s.displayTag" class="small text-mori-teal fw-medium" style="font-size: 0.75rem;">{{ s.displayTag }}</div>

                    <div v-if="isCurrentUserHost" class="text-secondary mt-1 px-1 rounded bg-light border" style="font-size: 0.65rem;">
                      {{ s.member?.phone || '無電話' }}
                    </div>
                  </div>

                  <div v-for="i in Math.max(0, game.maxPlayers - game.currentPlayers)" :key="'empty'+i" class="text-center empty-slot-wrapper" style="width: 80px;">
                    <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 empty-slot position-relative">
                      <i class="bi bi-plus-lg text-secondary fs-4 opacity-50"></i>
                    </div>
                    <div class="small text-muted fw-medium mt-1 opacity-75">空位</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4 mb-4">
              <div class="card-body p-4 p-md-5">
                <h4 class="fw-bold mb-4 pb-2 border-bottom"><i class="bi bi-ui-checks-grid text-mori-teal me-2"></i>活動細則與規格</h4>
                <div class="row g-3 pt-2">
                  <div class="col-md-4">
                    <div class="feature-tile rounded-4 p-4 text-center h-100 transition-all">
                      <div class="tile-icon bg-mori-teal bg-opacity-10 text-mori-teal rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
                        <i class="bi bi-vinyl-fill fs-3"></i>
                      </div>
                      <div class="small text-secondary mb-1">提供用球</div>
                      <div class="fw-bold text-dark fs-5">Yonex AS-50</div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="feature-tile rounded-4 p-4 text-center h-100 transition-all">
                      <div class="tile-icon bg-mori-warning bg-opacity-10 text-mori-warning rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
                        <i class="bi bi-grid-3x3 fs-3"></i>
                      </div>
                      <div class="small text-secondary mb-1">場地數量</div>
                      <div class="fw-bold text-dark fs-5">1 面場地</div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="feature-tile rounded-4 p-4 text-center h-100 transition-all">
                      <div class="tile-icon bg-mori-success bg-opacity-10 text-mori-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
                        <i class="bi bi-people-fill fs-3"></i>
                      </div>
                      <div class="small text-secondary mb-1">人數上限</div>
                      <div class="fw-bold text-dark fs-5">{{ game.maxPlayers }} 人</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4 mb-5">
              <div class="card-body p-4 p-md-5">
                <h4 class="fw-bold mb-4 pb-2 border-bottom"><i class="bi bi-geo-alt-fill text-mori-teal me-2"></i>場館位置</h4>
                <GoogleMap address="聖德基督學院" height="350px" />
              </div>
            </div>

          </div>

          <div class="col-lg-4">
            <div class="sticky-panel">

              <template v-if="isCurrentUserHost">
                <div class="card border-0 shadow-sm rounded-4 p-4 text-start bg-white">
                  <div class="badge bg-mori-warning text-white rounded-pill px-3 py-1 mb-3 fw-bold align-self-start" style="font-size: 0.78rem;">
                    👑 您是此場活動主揪
                  </div>
                 <div class="mb-4">
                  <div class="text-secondary small fw-medium">經費收支說明</div>
                  <div class="text-secondary mt-2 p-3 bg-light rounded" style="font-size: 0.85rem;">
                    <i class="bi bi-info-circle me-1"></i> 平台已完成場館預約扣款，請記得於現場向球友收取分攤費用喔！
                  </div>
                </div>

                  <hr class="border-light opacity-50 my-3">

                  <button
                    class="btn btn-mori-teal text-white w-100 rounded-pill fw-bold py-2 shadow-sm d-flex align-items-center justify-content-center gap-2 mb-2"
                    @click="router.push('/pickup')">
                    <i class="bi bi-collection-play-fill"></i> 回大廳進行點名管理
                  </button>

                  <button
                    class="btn btn-light border text-secondary w-100 rounded-pill fw-bold py-2 small"
                    @click="router.push('/pickup')">
                    <i class="bi bi-arrow-left"></i> 返回臨打大廳
                  </button>
                </div>
              </template>

              <template v-else>
                <SignupPanel
                  :game="game"
                  :is-joining="isJoining"
                  :button-text="signupButtonText"
                  :is-disabled-by-logic="isButtonDisabled"
                  :is-already-joined="isAlreadyJoined"    @submit-signup="onJoinGame"
                  @cancel-signup="onCancelGame"           />
              </template>

            </div>
          </div>

        </div>
      </div>
    </div>

  </div>
  <AuthModal v-model="showAuthModal" @login-success="onAuthSuccess" />
</template>

<style scoped>

/* 🪶 羽毛背景樣式 */
.feather-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none; /* 確保滑鼠穿透不干擾點擊 */
  z-index: 0;
}

.feather-item {
  position: absolute;
  user-select: none;
}

/* 確保詳情頁主要內容浮在羽毛之上 */
.content-wrapper {
  position: relative;
  z-index: 1;
}

/* 全域底色 */
.page-bg {
  background-color: #F8FAFC;
  min-height: 100vh;
}

/* ============================
   🎨 森系色彩定義
   ============================ */
.text-mori-teal { color: #457B9D !important; }
.text-mori-teal-light { color: #A8DADC !important; }
.bg-mori-teal { background-color: #457B9D !important; }

.bg-mori-coral { background-color: #E07A5F !important; }
.bg-mori-warning { background-color: #F4A261 !important; }
.text-mori-warning { color: #F4A261 !important; }
.bg-mori-success { background-color: #2A9D8F !important; }
.text-mori-success { color: #2A9D8F !important; }

/* 🪶 羽毛背景樣式 */
.feather-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none; /* 確保滑鼠穿透不干擾點擊 */
  z-index: 0;
}

.feather-item {
  position: absolute;
  user-select: none;
}

/* 確保詳情頁主要內容浮在羽毛之上 */
.content-wrapper {
  position: relative;
  z-index: 1;
}

/* 專屬主揪管理按鈕 (補上預設狀態) */
.btn-mori-teal {
  background-color: #457B9D !important; /* 預設的森藍綠底色 */
  color: #ffffff !important;            /* 白字 */
  border: none;
  transition: all 0.2s ease;
}

.btn-mori-teal:hover {
  background-color: #386785 !important; /* 懸停時稍微變深 */
  color: #ffffff !important;
  transform: translateY(-1px);
}
/* Banner 特效 */
.glass-badge {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}
.main-content {
  margin-top: -60px;
}

/* 頭像與動畫 */
.player-avatar {
  width: 65px;
  height: 65px;
  font-size: 1.6rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.player-avatar-wrapper:hover .player-avatar {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(69, 123, 157, 0.15) !important;
}

/* 🌟 空位佔位符號 (柔和虛線) */
.empty-slot {
  width: 65px;
  height: 65px;
  border: 2px dashed #E2E8F0;
  background-color: #F8FAFC !important;
  transition: all 0.3s ease;
}

/* 踢除按鈕 */
.kick-btn {
  top: -8px;
  right: 2px;
  width: 26px;
  height: 26px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  z-index: 10;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease-in-out;
}
.player-avatar-wrapper:hover .kick-btn {
  opacity: 1;
  transform: scale(1);
}
.kick-btn:hover {
  background-color: #C92A2A !important;
}

/* 特色小卡 */
.feature-tile {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
}
.feature-tile:hover {
  border-color: #457B9D;
  box-shadow: 0 10px 15px -3px rgba(69, 123, 157, 0.08);
  transform: translateY(-4px);
}
.transition-all {
  transition: all 0.3s ease;
}

.host-badge {
  letter-spacing: 1px;
}

/* 右側面板 Sticky 效果 */
.sticky-panel {
  position: sticky;
  top: 100px;
  z-index: 10;
}
</style>
