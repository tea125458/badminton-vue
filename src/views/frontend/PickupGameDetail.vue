<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePickupGameApi } from '@/composables/usePickupGameApi'
import SignupPanel from '@/components/frontend/SignupPanel.vue'
import GoogleMap from '@/components/common/GoogleMap.vue'

const route = useRoute()
const router = useRouter()
const gameId = route.params.id

const { pickupGames, fetchGames, signupsMap, fetchSignups, joinPickupGame, removeSignup } = usePickupGameApi()

const isLoaded = ref(false)
const isJoining = ref(false)

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
const currentMemberId = 1 // 假資料：目前登入的會員 ID

const isCurrentUserHost = computed(() => {
  if (!game.value || !game.value.host) return false
  return String(game.value.host?.memberId) === String(currentMemberId)
})

const mySignupCount = computed(() => {
  if (!signups.value) return 0
  return signups.value.filter(s => String(s.member?.memberId) === String(currentMemberId)).length
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

const onJoinGame = async (payload) => {
  if (isButtonDisabled.value) return

  // 🌟 前台詳情頁性別防呆檢查
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

// 主揪踢除成員功能
const handleKick = async (signupId, memberName) => {
  const result = await removeSignup(signupId, gameId, memberName)
  await Promise.all([
    fetchGames(),
    fetchSignups(gameId)
  ])
}
</script>

<template>
  <div class="page-bg">

    <!-- 讀取中 -->
    <div v-if="!isLoaded" class="vh-100 d-flex align-items-center justify-content-center">
      <div class="spinner-border text-sky-blue" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- 找不到資料 -->
    <div v-else-if="!game" class="vh-100 d-flex flex-column align-items-center justify-content-center">
      <i class="bi bi-emoji-frown fs-1 text-secondary mb-3"></i>
      <h4 class="text-secondary mb-4">找不到該筆揪團紀錄</h4>
      <button class="btn btn-outline-secondary rounded-pill px-4" @click="router.push('/pickup')">回揪團列表</button>
    </div>

    <!-- 內容區 -->
    <div v-else class="content-wrapper pb-5">

      <!-- 1. Hero Banner (全寬頂部視覺) -->
      <div class="hero-banner position-relative" style="background-image: url('/banner_c.jpg'); background-size: cover; background-position: center; height: 350px;">
        <!-- 漸層遮罩：左深右淺 -->
        <div class="position-absolute w-100 h-100 top-0 start-0" style="background: linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 70%);"></div>

        <div class="container position-relative h-100 d-flex align-items-center">
          <div class="w-100 text-white z-3">
            <!-- Tags (毛玻璃效果) -->
            <div class="d-flex gap-2 mb-3">
              <span class="badge rounded-pill glass-badge px-3 py-2 fw-medium">
                <i class="bi bi-trophy-fill text-warning me-1"></i> {{ skillMap[game.skillLevel] }}
              </span>
              <span class="badge rounded-pill glass-badge px-3 py-2 fw-medium">
                <i class="bi bi-circle-fill text-success me-1" style="font-size: 8px;"></i> 報名中
              </span>
            </div>
            <!-- Title -->
            <h1 class="fw-bold display-4 mb-3">{{ game.court?.venue?.venueName || '羽過天晴' }} 臨打團</h1>
            <!-- Meta Info -->
            <div class="d-flex flex-wrap gap-4 text-light opacity-75">
              <div class="d-flex align-items-center fs-5"><i class="bi bi-calendar-event me-2 text-sky-blue"></i> {{ game.gameDate }}</div>
              <div class="d-flex align-items-center fs-5"><i class="bi bi-clock me-2 text-sky-blue"></i> {{ game.startTime }} - {{ game.endTime }}</div>
              <div class="d-flex align-items-center fs-5"><i class="bi bi-geo-alt-fill me-2 text-sky-blue"></i> {{ game.court?.venue?.venueName || '羽球館' }} - {{ game.court?.courtName }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 下半部內容 (重疊在 Banner 上方) -->
      <div class="container main-content position-relative z-3">
        <div class="row g-4 g-lg-5">

          <!-- 左側資訊區 -->
          <div class="col-lg-8">

            <!-- 🌟 主揪推薦區塊 (移至上方，增加人情味) -->
            <div class="card border-0 shadow-sm rounded-4 mb-4">
              <div class="card-body p-4 p-md-5 d-flex align-items-start position-relative overflow-hidden">
                <div class="host-badge position-absolute top-0 end-0 bg-sky-blue text-white px-3 py-1 fw-bold rounded-bottom-start shadow-sm">
                  主揪發起
                </div>
                <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center me-4 flex-shrink-0 shadow-sm" style="width: 75px; height: 75px; font-size: 2rem;">
                  {{ game.host?.fullName?.charAt(0) }}
                </div>
                <div class="pe-4">
                  <h5 class="fw-bold mb-2">{{ game.host?.fullName }}</h5>
                  <p class="text-secondary mb-0" style="line-height: 1.8;">
                    哈囉！我是這場臨打的主揪。本次揪團程度要求為「<strong class="text-dark">{{ skillMap[game.skillLevel] }}</strong>」。
                    我們準備了高品質的比賽用球，現場氣氛輕鬆愉快，歡迎熱愛羽球的球友報名參加，一起流汗！
                  </p>
                </div>
              </div>
            </div>

            <!-- 👥 已報名隊友 -->
            <div class="card border-0 shadow-sm rounded-4 mb-4">
              <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <h4 class="fw-bold mb-0"><i class="bi bi-people-fill text-sky-blue me-2"></i>已報名隊友</h4>
                  <span class="badge bg-light text-secondary border fs-6 rounded-pill px-3 py-2">{{ game.currentPlayers }} / {{ game.maxPlayers }} 人</span>
                </div>

                <div class="d-flex flex-wrap gap-4 pt-2">
                  <!-- 已經報名的人 -->
                  <div v-for="s in displaySignups" :key="s.signupId" class="text-center position-relative player-avatar-wrapper" style="width: 80px;">
                    <!-- 踢出按鈕 -->
                    <button
                      v-if="isCurrentUserHost && s.displayTag !== '主揪' && game.status !== 'CANCELLED' && new Date(`${game.gameDate}T${game.endTime}`) >= new Date()"
                      @click="handleKick(s.signupId, s.member?.fullName)"
                      class="btn btn-danger btn-sm rounded-circle position-absolute shadow kick-btn"
                      title="踢除此成員"
                    >
                      <i class="bi bi-x"></i>
                    </button>

                    <div class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-2 position-relative shadow-sm player-avatar"
                         :class="s.displayTag === '主揪' ? 'bg-sky-blue' : 'bg-secondary'">
                      {{ s.member?.fullName?.charAt(0) || '無' }}
                      <span class="position-absolute bottom-0 end-0 p-1 bg-success border border-2 border-white rounded-circle" style="margin-bottom: 2px; margin-right: 2px;"></span>
                    </div>

                    <div class="small fw-bold text-truncate w-100 text-dark">{{ s.member?.fullName }}</div>
                    <div v-if="s.displayTag" class="small text-sky-blue fw-medium" style="font-size: 0.75rem;">{{ s.displayTag }}</div>

                    <!-- 聯絡方式 -->
                    <div v-if="isCurrentUserHost" class="text-secondary mt-1 px-1 rounded bg-light border" style="font-size: 0.65rem;">
                      {{ s.member?.phone || '無電話' }}
                    </div>
                  </div>

                  <!-- 剩下的空位 (帶有 hover 動畫的虛線框) -->
                  <div v-for="i in Math.max(0, game.maxPlayers - game.currentPlayers)" :key="'empty'+i" class="text-center empty-slot-wrapper" style="width: 80px;">
                    <div class="rounded-circle d-flex align-items-center justify-content-center bg-light mx-auto mb-2 empty-slot position-relative">
                      <i class="bi bi-plus-lg text-secondary fs-4"></i>
                    </div>
                    <div class="small text-muted fw-medium mt-1">空位</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 📝 活動細則與場館規格 -->
            <div class="card border-0 shadow-sm rounded-4 mb-4">
              <div class="card-body p-4 p-md-5">
                <h4 class="fw-bold mb-4 pb-2 border-bottom"><i class="bi bi-ui-checks-grid text-sky-blue me-2"></i>活動細則與規格</h4>
                <div class="row g-3 pt-2">
                  <div class="col-md-4">
                    <div class="feature-tile rounded-4 p-4 text-center h-100 transition-all">
                      <div class="tile-icon bg-sky-blue bg-opacity-10 text-sky-blue rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
                        <i class="bi bi-vinyl-fill fs-3"></i>
                      </div>
                      <div class="small text-secondary mb-1">提供用球</div>
                      <div class="fw-bold text-dark fs-5">Yonex AS-50</div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="feature-tile rounded-4 p-4 text-center h-100 transition-all">
                      <div class="tile-icon bg-warning bg-opacity-10 text-warning rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
                        <i class="bi bi-grid-3x3 fs-3"></i>
                      </div>
                      <div class="small text-secondary mb-1">場地數量</div>
                      <div class="fw-bold text-dark fs-5">1 面場地</div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="feature-tile rounded-4 p-4 text-center h-100 transition-all">
                      <div class="tile-icon bg-success bg-opacity-10 text-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
                        <i class="bi bi-people-fill fs-3"></i>
                      </div>
                      <div class="small text-secondary mb-1">人數上限</div>
                      <div class="fw-bold text-dark fs-5">{{ game.maxPlayers }} 人</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 🗺️ 真實地圖區塊 -->
            <div class="card border-0 shadow-sm rounded-4 mb-5">
              <div class="card-body p-4 p-md-5">
                <h4 class="fw-bold mb-4 pb-2 border-bottom"><i class="bi bi-geo-alt-fill text-sky-blue me-2"></i>場館位置</h4>
                <GoogleMap address="聖德基督學院" height="350px" />
              </div>
            </div>

          </div>

          <!-- 右側：固定報名卡片 (保持原本強大的元件邏輯) -->
          <div class="col-lg-4">
            <!-- 確保 SignupPanel 是 sticky-top -->
            <div class="sticky-panel">
              <SignupPanel
                :game="game"
                :is-joining="isJoining"
                :button-text="signupButtonText"
                :is-disabled-by-logic="isButtonDisabled"
                @submit-signup="onJoinGame"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 全域底色 */
.page-bg {
  background-color: #f1f5f9;
  min-height: 100vh;
}

/* 品牌色 */
.text-sky-blue { color: #0ea5e9 !important; }
.bg-sky-blue { background-color: #0ea5e9 !important; }

/* Banner 特效 */
.glass-badge {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}
.main-content {
  margin-top: -60px; /* 向上重疊 Banner，製造空間深度 */
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
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
}

/* 空位佔位符號動畫 */
.empty-slot {
  width: 65px;
  height: 65px;
  border: 2px dashed #cbd5e1;
  transition: all 0.3s ease;
  background-color: transparent !important;
}
.empty-slot-wrapper {
  cursor: pointer;
}
.empty-slot-wrapper:hover .empty-slot {
  border-color: #0ea5e9;
  background-color: #f0f9ff !important;
  transform: scale(1.08);
}
.empty-slot-wrapper:hover .empty-slot i {
  color: #0ea5e9 !important;
  transform: scale(1.2);
  transition: transform 0.3s ease;
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
  background-color: #b91c1c !important;
}

/* 特色小卡 (Feature Tiles) */
.feature-tile {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
}
.feature-tile:hover {
  border-color: #bae6fd;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  transform: translateY(-4px);
}
.transition-all {
  transition: all 0.3s ease;
}

/* 主揪推薦卡片標籤 */
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
