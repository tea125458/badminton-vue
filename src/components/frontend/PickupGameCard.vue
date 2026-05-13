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
.hover-bg-light:hover {
  background-color: #f8fafc !important;
}
input:focus {
  outline: none;
  box-shadow: none;
}
</style>
