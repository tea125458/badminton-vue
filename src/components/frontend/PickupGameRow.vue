<script setup>
import { computed } from 'vue'
const props = defineProps({
  game: {
    type: Object,
    required: true
  }
})
// 🌟 1. 程度翻譯對照表 (把資料庫的英文轉成中文)
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
// 🌟 2. 根據翻譯好的中文決定標籤顏色
const levelBadgeClass = computed(() => {
  const lvl = displayLevel.value
  switch (lvl) {
    case '初級': return 'text-success bg-success-subtle border border-success border-opacity-25'
    case '中級': return 'text-sky-blue bg-sky-blue-subtle border border-sky-blue border-opacity-25'
    case '高級': return 'text-danger bg-danger-subtle border border-danger border-opacity-25'
    default: return 'text-secondary bg-secondary-subtle border border-secondary border-opacity-25'
  }
})

// 🌟 3. 日期處理小工具
const getDayOfWeek = (dateStr) => {
  if (!dateStr) return ''
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  return days[new Date(dateStr).getDay()]
}
const isToday = (dateStr) => {
  if (!dateStr) return false
  const d = new Date()
  // 修正時區問題，使用本機日期
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
</script>
<template>
  <div class="card border-0 rounded-4 shadow-sm mb-4 game-card-hover" 
       @click="$emit('open-quick-view', game)">
    <div class="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
      
      <!-- 左側區域 -->
      <div class="d-flex flex-column gap-3">
        <!-- 頂部資訊 -->
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="fs-5 fw-bold text-dark">📅 {{ game.gameDate }} ({{ getDayOfWeek(game.gameDate) }})</span>
            <span v-if="isToday(game.gameDate)" class="badge bg-danger rounded-pill px-2 py-1 shadow-sm">🔥 今天</span>
            <span v-else-if="isTomorrow(game.gameDate)" class="badge bg-warning text-dark rounded-pill px-2 py-1 shadow-sm">🌟 明天</span>
          </div>
          <div class="d-flex align-items-center gap-3 text-secondary" style="font-size: 0.95rem;">
            <span><i class="bi bi-clock me-1 text-sky-blue"></i> {{ game.startTime }} - {{ game.endTime }}</span>
            <span>
              <i class="bi bi-geo-alt me-1 text-sky-blue"></i> 
              <template v-if="game.court">
                {{ game.court.venue?.venueName || '未指定場館' }} - {{ game.court.courtName || '未指定場地' }}
              </template>
              <template v-else>未指定場館</template>
            </span>
          </div>
        </div>

        <!-- 底部主揪資訊 -->
        <div class="d-flex align-items-center mt-2">
          <img :src="game.host?.photoUrl || `https://i.pravatar.cc/150?u=${game.host?.memberId}`"
               class="rounded-circle border me-2 shadow-sm" width="36" height="36" alt="avatar">
          <div class="d-flex flex-column">
            <span class="text-secondary" style="font-size: 0.75rem; letter-spacing: 0.5px;">主揪人</span>
            <span class="fw-bold text-dark fs-6">{{ game.host?.fullName || '揪團主' }}</span>
          </div>
        </div>
      </div>

      <!-- 右側區域 -->
      <div class="d-flex flex-row flex-md-column align-items-center align-items-md-end justify-content-between gap-3 mt-2 mt-md-0 pt-3 pt-md-0 border-top-md-none">
        <!-- 程度標籤 -->
        <div class="text-md-end">
          <span class="badge rounded-pill px-4 py-2 fs-6 fw-bold shadow-sm" :class="levelBadgeClass">
            {{ displayLevel }}
          </span>
        </div>
        <!-- 報名人數 -->
        <div class="d-flex flex-column align-items-end">
          <div class="text-secondary fw-medium mb-1" style="font-size: 0.85rem;">目前報名進度</div>
          <div class="d-flex align-items-center gap-2">
            <div class="fs-4 fw-bold" :class="game.currentPlayers >= game.maxPlayers ? 'text-danger' : 'text-dark'">
              {{ game.currentPlayers }} <span class="fs-6 text-secondary fw-normal">/ {{ game.maxPlayers }} 人</span>
            </div>
            <span v-if="game.currentPlayers >= game.maxPlayers" class="badge bg-danger-subtle text-danger rounded-pill">已滿團</span>
            <span v-else class="badge bg-success-subtle text-success rounded-pill">報名中</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
<style scoped>
:root {
  --sky-blue: #0ea5e9;
  --sky-blue-subtle: #e0f2fe;
}
.text-sky-blue { color: var(--sky-blue); }
.bg-sky-blue { background-color: var(--sky-blue); }
.bg-sky-blue-subtle { background-color: var(--sky-blue-subtle); }
/* 🌟 查看詳情按鈕的專屬樣式 (參考圖的透明底+灰框) */
.outline-btn-custom {
  border: 1.5px solid #d1d5db;
  color: #374151;
  background: transparent;
  transition: all 0.2s;
}
.outline-btn-custom:hover {
  border-color: #0ea5e9;
  color: #0ea5e9;
  background-color: #f0f9ff;
}
/* 🌟 卡片懸浮時的浮起效果 */
.game-card-hover {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid transparent !important;
}
.game-card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(14, 165, 233, 0.15) !important;
  border-color: rgba(14, 165, 233, 0.3) !important;
}
.border-top-md-none {
  border-top: 1px solid #eaeaea;
}
@media (min-width: 768px) {
  .border-top-md-none {
    border-top: none !important;
  }
}
</style>
