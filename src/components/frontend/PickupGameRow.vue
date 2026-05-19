<script setup>
import { computed } from 'vue'

const props = defineProps({
  game: {
    type: Object,
    required: true
  },
  isRegistered: {
    type: Boolean,
    default: false
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
  return null 
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

// 🌟 4. 報名進度 (更換為森系自訂顏色)
const isFull = computed(() => props.game.currentPlayers >= props.game.maxPlayers)
const progressPercent = computed(() => {
  if (!props.game.maxPlayers) return 0
  return Math.round((props.game.currentPlayers / props.game.maxPlayers) * 100)
})
const progressColor = computed(() => {
  if (isFull.value) return 'bg-mori-coral'   // 柔和珊瑚紅 (滿團)
  if (progressPercent.value >= 75) return 'bg-mori-warning' // 溫暖橘黃 (快滿)
  return 'bg-mori-teal'                      // 主題藍綠色 (正常)
})

// 🌟 5. 卡片主標題 
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

// 🌟 6. 點擊卡片
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
       :class="isHost ? 'host-card' : 'border-0 shadow-sm'"
       @click="handleCardClick">
    <div class="card-body d-flex flex-row p-4 gap-4">

      <div class="date-square flex-shrink-0">
        <span class="date-month">{{ dateMonth }}</span>
        <span class="date-day">{{ dateDay }}</span>
        <span class="date-dow">{{ dateDow }}</span>
        <span v-if="isToday(game.gameDate)" class="date-tag date-tag-today">TODAY</span>
        <span v-else-if="isTomorrow(game.gameDate)" class="date-tag date-tag-tomorrow">明天</span>
      </div>

      <div class="flex-grow-1 d-flex flex-column">
        <h6 class="fw-bold text-dark mb-2 card-title-line">
          {{ cardTitle }}
          <span v-if="isHost" class="badge bg-mori-light text-mori-teal ms-2" style="font-size: 0.75rem;">👑 我的開團</span>
          <span v-if="game.description" class="text-muted fw-normal ms-2" style="font-size: 0.78rem;">
            · {{ game.description }}
          </span>
        </h6>

        <div class="d-flex flex-wrap align-items-center gap-3 text-muted small mb-3">
          <span><i class="bi bi-clock me-1 text-mori-teal"></i>{{ game.startTime }} - {{ game.endTime }}</span>
          <span>
            <i class="bi bi-geo-alt me-1 text-mori-teal"></i>
            <template v-if="game.court">
              {{ game.court.venue?.venueName || '未指定場館' }} · {{ game.court.courtName || '未指定場地' }}
            </template>
            <template v-else>未指定場館</template>
          </span>
        </div>

        <div class="d-flex align-items-center mt-auto">
          <img :src="game.host?.photoUrl || `https://i.pravatar.cc/150?u=${game.host?.memberId}`"
               class="rounded-circle me-2 host-avatar" width="32" height="32" alt="avatar">
          <span class="small text-secondary">{{ game.host?.fullName || '揪團主' }}</span>
        </div>
      </div>

      <div class="d-flex flex-column align-items-end justify-content-between right-panel">
        <div class="d-flex flex-wrap gap-1 justify-content-end">
          <span class="badge level-badge rounded-pill px-2 py-1 small">{{ displayLevel }}</span>
          <span v-if="genderBadge" class="badge rounded-pill px-2 py-1 small" :class="genderBadge.class">
            {{ genderBadge.label }}
          </span>
        </div>

        <div class="w-100 mt-auto">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="text-muted" style="font-size: 0.72rem;">報名進度</span>
            <span class="fw-bold small" :class="isFull ? 'text-mori-coral' : 'text-dark'">
              {{ game.currentPlayers }} / {{ game.maxPlayers }} 人
            </span>
          </div>
          <div class="progress" style="height: 4px;">
            <div class="progress-bar rounded-pill" :class="progressColor"
                 role="progressbar" :style="{ width: progressPercent + '%' }"></div>
          </div>
          
          <template v-if="isHost">
            <button class="btn btn-outline-mori btn-sm mt-2 w-100 rounded-pill fw-bold"
                    @click.stop="$emit('manage-game', game)">
              <i class="bi bi-gear-fill me-1"></i>管理揪團
            </button>
          </template>
          <template v-else-if="isRegistered">
            <button class="btn btn-outline-mori-success btn-sm mt-2 w-100 rounded-pill fw-bold"
                    @click.stop="$emit('open-quick-view', game)">
              <i class="bi bi-check2-circle me-1"></i>報名資訊
            </button>
          </template>
          <template v-else>
            <button v-if="!isFull" class="btn btn-sm mt-2 w-100 rounded-pill fw-bold btn-mori-join"
                    @click.stop="$emit('open-quick-view', game)">
              立即報名
            </button>
            <button v-else class="btn btn-mori-disabled btn-sm mt-2 w-100 rounded-pill fw-bold" disabled>
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
   🎨 森系色彩定義 (輔助類)
   ============================ */
.text-mori-teal { color: #457B9D !important; }
.text-mori-coral { color: #E07A5F !important; }

.bg-mori-teal { background-color: #457B9D !important; }
.bg-mori-coral { background-color: #E07A5F !important; }
.bg-mori-warning { background-color: #F4A261 !important; }
.bg-mori-light { background-color: #F1FAEE !important; }

/* ============================
   🎯 日曆卡片 (Date Square)
   ============================ */
.date-square {
  width: 64px;
  min-height: 72px;
  background-color: #F8FAFC; /* 更乾淨的淺灰白底 */
  border: 1px solid #E2E8F0; /* 極淡的邊框 */
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
  color: #457B9D; /* 森系藍綠 */
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
  padding: 2px 6px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.date-tag-today {
  background: #E07A5F; /* 柔和珊瑚紅 */
  color: #fff;
}
.date-tag-tomorrow {
  background: #F4A261; /* 柔和橘黃 */
  color: #fff;
}

/* ============================
   🎯 主揪專屬卡片樣式 (一眼看出差別的淺藍底色版)
   ============================ */
.host-card {
  background-color: #F0F9FF !important; /* 乾淨清爽的極淺晴空藍 */
  border: 1px solid #BAE6FD !important; /* 邊框配合淡淡的水藍色 */
  border-left: 5px solid #457B9D !important; /* 🌟 保留左側森藍綠粗線，穩住視覺重量 */
  box-shadow: 0 4px 16px rgba(69, 123, 157, 0.08); /* 稍微加深一點點專屬陰影 */
}

/* ============================
   🎯 按鈕樣式
   ============================ */
.btn-mori-join {
  background-color: #457B9D;
  color: white;
  border: none;
  font-size: 0.8rem;
  padding: 6px 0;
  transition: all 0.2s;
}
.btn-mori-join:hover {
  background-color: #386785;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(69, 123, 157, 0.3);
}

.btn-outline-mori {
  color: #457B9D;
  border: 1px solid #457B9D;
  background: transparent;
}
.btn-outline-mori:hover {
  background-color: #F1FAEE;
  color: #457B9D;
}

.btn-outline-mori-success {
  color: #2A9D8F;
  border: 1px solid #2A9D8F;
  background: transparent;
}
.btn-outline-mori-success:hover {
  background-color: #E6F5F3;
  color: #2A9D8F;
}

.btn-mori-disabled {
  background-color: #F1F5F9;
  color: #94A3B8;
  border: none;
}

/* ============================
   🎯 徽章樣式
   ============================ */
.level-badge {
  background-color: #F8FAFC; 
  color: #64748B;
  border: 1px solid #E2E8F0;
}
.badge-male {
  background-color: #F0F9FF !important;
  color: #0284C7 !important;
  border: 1px solid #BAE6FD !important;
}
.badge-female {
  background-color: #FFF1F2 !important;
  color: #E11D48 !important;
  border: 1px solid #FECDD3 !important;
}

/* ============================
   🎯 卡片互動與其他
   ============================ */
.card-title-line { font-size: 0.95rem; line-height: 1.4; }
.host-avatar { border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); object-fit: cover; }
.right-panel { min-width: 140px; max-width: 160px; }
.progress { background-color: #F1F5F9; border-radius: 4px; overflow: hidden; }

.game-card-hover {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid transparent !important;
}
.game-card-hover:hover {
  transform: translateY(-4px);
  /* 使用藍綠色調的發光陰影 */
  box-shadow: 0 12px 30px rgba(69, 123, 157, 0.12) !important; 
  border-color: rgba(69, 123, 157, 0.15) !important;
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
