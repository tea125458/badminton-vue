<script setup>
import { computed } from 'vue'
const props = defineProps({
  game: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['open-quick-view', 'manage-game'])

// 🌟 登入者身分判斷 (Role-based UI)
const currentUser = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('memberInfo')) || {}
  } catch {
    return {}
  }
})
const isHost = computed(() => {
  return currentUser.value.memberId && props.game.host?.memberId && 
         currentUser.value.memberId === props.game.host.memberId
})

// 🌟 1. 程度翻譯對照表
const levelMap = {
  'BEGINNER': '初級',
  'INTERMEDIATE': '中級',
  'ADVANCED': '高級',
  'ALL': '不限'
}
const displayLevel = computed(() => {
  const lvl = props.game.skillLevel || props.game.level
  return levelMap[lvl] || lvl || '不限'
})

// 🌟 2. 性別顯示
const genderBadge = computed(() => {
  const g = props.game.requiredGender || props.game.genderLimit || 'ALL'
  if (g === 'FEMALE') return { label: '限女', class: 'badge-female' }
  if (g === 'MALE') return { label: '限男', class: 'badge-male' }
  return null // ALL → 不顯示
})

// 🌟 3. 日期處理
const getDayOfWeek = (dateStr) => {
  if (!dateStr) return ''
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  return days[new Date(dateStr).getDay()]
}

const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const dateMonth = computed(() => {
  if (!props.game.gameDate) return ''
  const m = parseInt(props.game.gameDate.split('-')[1]) - 1
  return monthNames[m] || ''
})
const dateDay = computed(() => {
  if (!props.game.gameDate) return ''
  return parseInt(props.game.gameDate.split('-')[2])
})
const dateDow = computed(() => getDayOfWeek(props.game.gameDate))

const isToday = (dateStr) => {
  if (!dateStr) return false
  const d = new Date()
  const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return dateStr === todayStr
}
const isTomorrow = (dateStr) => {
  if (!dateStr) return false
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const tomorrowStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return dateStr === tomorrowStr
}

// 🌟 4. 報名進度
const isFull = computed(() => props.game.currentPlayers >= props.game.maxPlayers)
const progressPercent = computed(() => {
  if (!props.game.maxPlayers) return 0
  return Math.round((props.game.currentPlayers / props.game.maxPlayers) * 100)
})
const progressColor = computed(() => {
  if (isFull.value) return 'bg-danger'
  if (progressPercent.value >= 75) return 'bg-warning'
  return 'bg-primary'
})

// 🌟 5. 卡片主標題 (組合星期 + 時段描述)
const cardTitle = computed(() => {
  const dow = dateDow.value
  const st = props.game.startTime
  if (!st) return `${dow} 場次`
  const hour = parseInt(st.split(':')[0])
  let period = '早上'
  if (hour >= 12 && hour < 18) period = '下午'
  else if (hour >= 18) period = '晚間'
  return `${dow}${period}場`
})

// 🌟 6. 點擊卡片：團主 → 管理揪團 / 非團主 → 快速報名
const handleCardClick = () => {
  if (isHost.value) {
    emit('manage-game', props.game)
  } else {
    emit('open-quick-view', props.game)
  }
}
</script>
<template>
  <div class="card rounded-4 mb-3 game-card-hover col-12 col-lg-10 col-xl-8 mx-auto"
       :class="isHost ? 'bg-primary bg-opacity-10 border border-primary' : 'border-0 shadow-sm'"
       @click="handleCardClick">
    <div class="card-body d-flex flex-row p-4 gap-4">

      <!-- ▌第 1 欄：左側日曆卡片 -->
      <div class="date-square flex-shrink-0">
        <span class="date-month">{{ dateMonth }}</span>
        <span class="date-day">{{ dateDay }}</span>
        <span class="date-dow">{{ dateDow }}</span>
        <!-- 今天/明天小標籤 -->
        <span v-if="isToday(game.gameDate)" class="date-tag date-tag-today">TODAY</span>
        <span v-else-if="isTomorrow(game.gameDate)" class="date-tag date-tag-tomorrow">明天</span>
      </div>

      <!-- ▌第 2 欄：中間核心資訊 -->
      <div class="flex-grow-1 d-flex flex-column">
        <!-- 主標題 -->
        <h6 class="fw-bold text-dark mb-2 card-title-line">
          {{ cardTitle }}
          <span v-if="isHost" class="badge bg-warning text-dark ms-2" style="font-size: 0.75rem;">👑 我的開團</span>
          <span v-if="game.description" class="text-muted fw-normal ms-2" style="font-size: 0.78rem;">
            · {{ game.description }}
          </span>
        </h6>

        <!-- 時間 + 地點 -->
        <div class="d-flex flex-wrap align-items-center gap-3 text-muted small mb-3">
          <span><i class="bi bi-clock me-1"></i>{{ game.startTime }} - {{ game.endTime }}</span>
          <span>
            <i class="bi bi-geo-alt me-1"></i>
            <template v-if="game.court">
              {{ game.court.venue?.venueName || '未指定場館' }} · {{ game.court.courtName || '未指定場地' }}
            </template>
            <template v-else>未指定場館</template>
          </span>
        </div>

        <!-- 底部：主揪 (mt-auto 推到底) -->
        <div class="d-flex align-items-center mt-auto">
          <img :src="game.host?.photoUrl || `https://i.pravatar.cc/150?u=${game.host?.memberId}`"
               class="rounded-circle me-2 host-avatar" width="32" height="32" alt="avatar">
          <span class="small text-secondary">{{ game.host?.fullName || '揪團主' }}</span>
        </div>
      </div>

      <!-- ▌第 3 欄：右側行動與狀態區 -->
      <div class="d-flex flex-column align-items-end justify-content-between right-panel">
        <!-- 右上角：標籤群 -->
        <div class="d-flex flex-wrap gap-1 justify-content-end">
          <span class="badge bg-light text-secondary border rounded-pill px-2 py-1 small">{{ displayLevel }}</span>
          <span v-if="genderBadge" class="badge rounded-pill px-2 py-1 small" :class="genderBadge.class">
            {{ genderBadge.label }}
          </span>
        </div>

        <!-- 右下角：報名進度 + 按鈕 -->
        <div class="w-100 mt-auto">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="text-muted" style="font-size: 0.72rem;">報名進度</span>
            <span class="fw-bold small">{{ game.currentPlayers }} / {{ game.maxPlayers }} 人</span>
          </div>
          <div class="progress" style="height: 4px;">
            <div class="progress-bar rounded-pill" :class="progressColor"
                 role="progressbar" :style="{ width: progressPercent + '%' }"></div>
          </div>
          
          <!-- 底部按鈕切換 (v-if / v-else) -->
          <template v-if="isHost">
            <button class="btn btn-outline-dark btn-sm mt-2 w-100 rounded-pill fw-bold"
                    @click.stop="$emit('manage-game', game)">
              <i class="bi bi-gear-fill me-1"></i>管理揪團
            </button>
          </template>
          <template v-else>
            <button v-if="!isFull" class="btn btn-primary btn-sm mt-2 w-100 rounded-pill fw-bold btn-join"
                    @click.stop="$emit('open-quick-view', game)">
              立即報名
            </button>
            <button v-else class="btn btn-outline-secondary btn-sm mt-2 w-100 rounded-pill fw-bold" disabled>
              已滿團
            </button>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>
<style scoped>
/* ============================
   🎯 日曆卡片 (Date Square)
   ============================ */
.date-square {
  width: 64px;
  min-height: 72px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e8f4fd 100%);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  position: relative;
}
.date-month {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #94a3b8;
  text-transform: uppercase;
}
.date-day {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0c4a6e;
  line-height: 1.1;
}
.date-dow {
  font-size: 0.6rem;
  font-weight: 600;
  color: #64748b;
  margin-top: 1px;
}
.date-tag {
  position: absolute;
  top: -6px;
  right: -10px;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}
.date-tag-today {
  background: #ef4444;
  color: #fff;
}
.date-tag-tomorrow {
  background: #f59e0b;
  color: #fff;
}

/* ============================
   🎯 中間核心資訊
   ============================ */
.card-title-line {
  font-size: 0.95rem;
  line-height: 1.4;
}

.host-avatar {
  border: 2px solid #e2e8f0;
  object-fit: cover;
}

/* ============================
   🎯 右側行動區
   ============================ */
.right-panel {
  min-width: 140px;
  max-width: 160px;
}

.btn-join {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border: none;
  font-size: 0.8rem;
  padding: 6px 0;
  transition: all 0.2s;
}
.btn-join:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
}

/* ============================
   🎯 性別徽章
   ============================ */
.badge-male {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
  border: 1px solid #90caf9 !important;
}
.badge-female {
  background-color: #fce4ec !important;
  color: #d81b60 !important;
  border: 1px solid #f48fb1 !important;
}

/* ============================
   🎯 進度條
   ============================ */
.progress {
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

/* ============================
   🎯 卡片互動
   ============================ */
.game-card-hover {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid transparent !important;
}
.game-card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(14, 165, 233, 0.12) !important;
  border-color: rgba(14, 165, 233, 0.2) !important;
}

/* ============================
   🎯 響應式 (手機)
   ============================ */
@media (max-width: 576px) {
  .card-body {
    flex-direction: column !important;
    gap: 16px !important;
    padding: 16px !important;
  }
  .date-square {
    flex-direction: row;
    width: auto;
    min-height: auto;
    padding: 8px 16px;
    gap: 8px;
    border-radius: 10px;
  }
  .date-day { font-size: 1.2rem; }
  .date-month, .date-dow { font-size: 0.6rem; }
  .right-panel {
    min-width: 100%;
    max-width: 100%;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    border-top: 1px solid #f1f5f9;
    padding-top: 12px;
  }
}
</style>
