<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import PickupGameRow from '@/components/frontend/PickupGameRow.vue'
// 🌟 1. 引入剛剛做的表單 Modal
import CreateGameModal from '@/components/frontend/CreateGameModal.vue'
import { usePickupGameApi } from '@/composables/usePickupGameApi'
const router = useRouter()
const { pickupGames, fetchGames } = usePickupGameApi()
const searchQuery = ref('')
const activeDateFilter = ref('全部')
// 🌟 2. 準備用來控制 Modal 開關的變數
const createModalRef = ref(null)
const getTodayStr = () => new Date().toISOString().split('T')[0]
const getTomorrowStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
const isWeekend = (dateStr) => {
  const day = new Date(dateStr).getDay()
  return day === 0 || day === 6
}
const availableGames = computed(() => {
  let result = pickupGames.value.filter(game => game.status !== 'CANCELLED' && game.status !== 'CLOSED')

  if (activeDateFilter.value === '今天') {
    result = result.filter(g => g.gameDate === getTodayStr())
  } else if (activeDateFilter.value === '明天') {
    result = result.filter(g => g.gameDate === getTomorrowStr())
  } else if (activeDateFilter.value === '本週末') {
    result = result.filter(g => isWeekend(g.gameDate))
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(game => {
      const searchText = `${game.venue?.venueName} ${game.court?.courtName} ${game.host?.fullName}`.toLowerCase()
      return searchText.includes(q)
    })
  }

  return result
})
const handleViewDetails = (game) => {
  router.push(`/pickup/${game.gameId}`)
}
onMounted(() => {
  fetchGames()
})
</script>
<template>
  <div class="container py-5 mt-5">
    <!-- 標題區 -->
    <div class="mb-5 d-flex justify-content-between align-items-center">
      <div>
        <h2 class="fw-bold text-dark mb-2">羽球臨打活動</h2>
        <p class="text-secondary mb-0">尋找適合你的場次，隨時加入熱血對決</p>
      </div>
    </div>
    <!-- 頂部膠囊型搜尋列 -->
    <div class="d-flex align-items-center gap-3 mb-5 mt-3">

      <!-- 1. 快速日期選擇 -->
      <div class="bg-light rounded-pill p-1 d-flex align-items-center" style="border: 1px solid #e2e8f0;">
        <button
          class="btn btn-sm rounded-pill px-4 border-0 transition-all"
          :class="activeDateFilter === '全部' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          @click="activeDateFilter = '全部'"
        >全部</button>
        <button
          class="btn btn-sm rounded-pill px-4 border-0 transition-all"
          :class="activeDateFilter === '今天' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          @click="activeDateFilter = '今天'"
        >今天</button>
        <button
          class="btn btn-sm rounded-pill px-4 border-0 transition-all"
          :class="activeDateFilter === '明天' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          @click="activeDateFilter = '明天'"
        >明天</button>
        <button
          class="btn btn-sm rounded-pill px-4 border-0 transition-all"
          :class="activeDateFilter === '本週末' ? 'bg-white shadow-sm fw-bold text-dark' : 'text-secondary'"
          @click="activeDateFilter = '本週末'"
        >本週末</button>
      </div>
      <div class="text-secondary opacity-25">|</div>
      <!-- 2. 選擇日期 -->
      <button class="btn rounded-pill px-4 bg-white hover-bg-light" style="border: 1px solid #e2e8f0;">
        <i class="bi bi-calendar3 me-2" style="color: #65a30d;"></i>
        <span class="text-dark fw-medium">選擇日期</span>
      </button>
      <!-- 3. 主搜尋框 -->
      <div class="flex-grow-1 bg-light rounded-pill d-flex align-items-center px-4 py-2" style="border: 1px solid #e2e8f0;">
        <i class="bi bi-geo-alt fs-5 text-secondary me-3"></i>
        <input type="text" v-model="searchQuery" class="form-control bg-transparent border-0 shadow-none p-0 text-dark" placeholder="搜尋場館、城市或球場...">
      </div>
      <!-- 🌟 4. 發起揪團按鈕 (你剛剛找不到的地方) 🌟 -->
      <button
        class="btn rounded-pill px-4 text-white fw-bold shadow-sm"
        style="background-color: #0ea5e9;"
        @click="createModalRef.showModal()"
      >
        <i class="bi bi-plus-lg me-1"></i> 發起揪團
      </button>
      <!-- 5. 進階篩選 -->
      <button class="btn rounded-pill px-4 bg-white hover-bg-light" style="border: 1px solid #e2e8f0;">
        <i class="bi bi-sliders me-2 text-dark"></i>
        <span class="text-dark fw-medium">進階篩選</span>
      </button>
    </div>
    <!-- 列表資料區 -->
    <div class="mt-4">
      <PickupGameRow
        v-for="game in availableGames"
        :key="game.gameId"
        :game="game"
        @view-details="handleViewDetails"
      />
      <div v-if="availableGames.length === 0" class="text-center py-5 text-secondary">
        目前沒有符合條件的臨打場次喔！
      </div>
    </div>
    <!-- 🌟 3. 將表單掛載到網頁的最底部 -->
    <CreateGameModal ref="createModalRef" @refresh-list="fetchGames" />
  </div>
</template>
<style scoped>
/* ============================================================
   🎨 森系清新風 (Mori-kei Fresh Style) 核心樣式
   ============================================================ */

/* 輔助類別 */
.text-mori-teal { color: #457B9D !important; }
.bg-mori-teal { background-color: #457B9D !important; }

/* 列表中的卡片樣式 */
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
.date-input-overlay { cursor: pointer; }
.date-input-overlay::-webkit-calendar-picker-indicator {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;
}

/* 輕微懸停背景：使用森系米白 */
.hover-bg-light:hover { background-color: #F1FAEE !important; }
input:focus { outline: none; box-shadow: none; }

/* ============================
   🌟 Quick View Modal 樣式
   ============================ */

/* 資訊卡背景 - 純白配細微發光陰影 */
.qv-info-card {
  background-color: #fff; 
  border-radius: 12px; 
  padding: 20px; 
  box-shadow: 0 4px 16px rgba(69, 123, 157, 0.05);
  border: none; 
}

/* 程度徽章 */
.qv-badge-level {
  background-color: #F8FAFC; 
  color: #64748B;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 4px;
  padding: 3px 8px;
  border: none; 
}

/* 性別徽章 */
.qv-badge-female { background-color: #fce4ec !important; color: #d81b60 !important; font-size: 0.72rem; font-weight: 600; border: 1px solid #f48fb1 !important; border-radius: 4px; padding: 3px 8px; }
.qv-badge-male { background-color: #e3f2fd !important; color: #1976d2 !important; font-size: 0.72rem; font-weight: 600; border: 1px solid #90caf9 !important; border-radius: 4px; padding: 3px 8px; }
.qv-badge-all { background-color: #f1f5f9 !important; color: #64748b !important; font-size: 0.72rem; font-weight: 600; border: 1px solid #e2e8f0 !important; border-radius: 4px; padding: 3px 8px; }

/* 揪團標籤 */
.qv-tag { background-color: #F1FAEE; color: #457B9D; font-size: 0.68rem; font-weight: 600; border: none; border-radius: 4px; padding: 2px 6px; }

/* 進度條品牌色 */
.bg-sky-blue-bar { background-color: #457B9D !important; }

/* 程度選擇器 (橫排按鈕) */
.qv-level-option {
  cursor: pointer; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 10px; 
  font-size: 0.85rem; color: #64748B; background-color: #fff;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s; 
}
.qv-level-option:hover { border-color: #457B9D; color: #457B9D; background-color: #F1FAEE; }
.qv-level-option.active { border-color: #457B9D; background-color: #457B9D; color: #fff; box-shadow: 0 4px 12px rgba(69, 123, 157, 0.2); }

/* 確認報名按鈕 */
.qv-btn-submit {
  background-color: #457B9D; color: #fff; border: none; border-radius: 12px; 
  padding: 12px 24px; font-weight: 600; transition: transform 0.2s, box-shadow 0.2s;
}
.qv-btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(69, 123, 157, 0.3); }
.qv-btn-submit:disabled { background-color: #CBD5E1; color: #fff; opacity: 0.7; transform: none; box-shadow: none; }


/* 👇 這是為 Modal 新增的柔和質感樣式 👇 */

/* 退出揪團按鈕 (柔和珊瑚紅，取代原本刺眼的紅框) */
.qv-btn-exit {
  background-color: #FFF0F0 !important;
  color: #E07A5F !important;
  border: none !important;
  transition: all 0.2s;
}
.qv-btn-exit:hover {
  background-color: #FCE8E8 !important;
  color: #C92A2A !important;
}

/* 報名成功提示框 (柔和淺灰綠，取代原本生硬的綠色) */
.qv-alert-success {
  background-color: #F1FAEE !important;
  color: #2A9D8F !important;
  border: 1px solid #E6F5F3 !important;
}

/* 主揪電話徽章 (柔和淺灰綠) */
.qv-phone-badge {
  background-color: #E6F5F3 !important;
  color: #2A9D8F !important;
  border: none !important;
}
</style>