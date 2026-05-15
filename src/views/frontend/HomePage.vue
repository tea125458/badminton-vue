<script setup>
/**
 * 前台首頁
 * 公開頁面 — 不管有沒有登入都看得到
 *
 * Section 組成：
 * 1. Hero Banner（品牌 + CTA）
 * 2. 最新公告輪播 + 羽球影片
 * 3. 近期揪團活動
 * 4. 熱門場館
 * 5. 熱賣商品
 * 6. 場館環境介紹
 * 7. 新手指南
 * 8. CTA 加入會員
 */
import HomeHero from '@/components/frontend/HomeHero.vue'
import HomeNewsVideo from '@/components/frontend/HomeNewsVideo.vue'
import HomePickupGames from '@/components/frontend/HomePickupGames.vue'
import HomeVenues from '@/components/frontend/HomeVenues.vue'
import HomeProducts from '@/components/frontend/HomeProducts.vue'
import HomeEnvironment from '@/components/frontend/HomeEnvironment.vue'
import HomeGuide from '@/components/frontend/HomeGuide.vue'
import HomeCta from '@/components/frontend/HomeCta.vue'
</script>

<template>
  <div class="home-page">
    <!-- Hero 滿版：不受 container 限制 -->
    <HomeHero />
    <div class="container py-4">
      <HomeNewsVideo />
      <HomePickupGames />
      <HomeVenues />
      <HomeProducts />
      <HomeEnvironment />
      <HomeGuide />
      <HomeCta />
    </div>
  </div>
</template>
