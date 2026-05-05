<script setup>
/**
 * 前台版面配置
 * 包含：上方 Navbar + 中間內容區（RouterView）+ 下方 Footer
 *
 * 結構：
 * ┌─────────────────────────────┐
 * │         Navbar              │
 * ├─────────────────────────────┤
 * │                             │
 * │        <RouterView />       │
 * │                             │
 * ├─────────────────────────────┤
 * │         Footer              │
 * └─────────────────────────────┘
 */
import FrontNavbar from '@/components/frontend/FrontNavbar.vue'
import FrontFooter from '@/components/frontend/FrontFooter.vue'
</script>

<template>
  <div class="front-layout">
    <FrontNavbar />
    <main class="front-content">
      <RouterView />
    </main>
    <FrontFooter />
  </div>
</template>

<style scoped>
.front-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.front-content {
  flex: 1;
  padding: 20px;
}
</style>
