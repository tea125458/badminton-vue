<script setup>
import { onMounted, computed } from 'vue'
// 1. 引入我們剛做好的單一卡片元件
import PickupGameCard from '@/components/frontend/PickupGameCard.vue'
// 2. 引入抓資料的 API 大腦
import { usePickupGameApi } from '@/composables/usePickupGameApi'
const { pickupGames, fetchGames } = usePickupGameApi()
// 3. 計算屬性：過濾掉取消/關閉的，並且「只取前 3 筆」顯示在首頁
const recentGames = computed(() => {
  return pickupGames.value
    .filter(game => game.status !== 'CANCELLED' && game.status !== 'CLOSED')
    .slice(0, 3) // 只拿陣列的前三個
})
onMounted(() => {
  fetchGames()
})
</script>
<template>
  <section class="mb-5">
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h2 class="section-title mb-0">近期揪團活動</h2>
      <!-- 點擊查看全部，就會連到我們剛做好的 /pickup 完整列表頁！ -->
      <RouterLink to="/pickup" class="text-decoration-none fw-bold" style="color: var(--brand-sky); font-size: 0.875rem;">
        查看全部 <i class="bi bi-arrow-right"></i>
      </RouterLink>
    </div>
    <!-- 骨架屏 / 沒資料的防呆 -->
    <div v-if="pickupGames.length === 0" class="text-center text-muted py-4">
      資料載入中...
    </div>
    <!-- 真實資料列表 -->
    <div v-else class="row g-4">
      <div v-for="game in recentGames" :key="game.gameId" class="col-md-6 col-lg-4">
        <!-- 4. 重複使用剛剛建好的卡片元件！ -->
        <PickupGameCard :game="game" />
      </div>
    </div>
  </section>
</template>
