<script setup>
/**
 * 後台版面配置
 * 包含：左側 Sidebar + 上方 Header + 中間內容區（RouterView）
 *
 * 結構：
 * ┌──────┬──────────────────────┐
 * │      │      Header          │
 * │ Side ├──────────────────────┤
 * │ bar  │                      │
 * │      │    <RouterView />    │
 * │      │                      │
 * └──────┴──────────────────────┘
 */
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
</script>

<template>
  <div class="admin-layout">
    <AdminSidebar />
    <div class="admin-main">
      <AdminHeader />
      <div class="admin-content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.admin-content {
  flex: 1;
  padding: 20px;
}
</style>
