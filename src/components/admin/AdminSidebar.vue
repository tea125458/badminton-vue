<script setup>
// TODO: 實作後台側邊欄導覽選單
// 包含：會員管理、場館管理、場地管理、預約管理、商品管理、訂單管理、公告管理、揪團管理
</script>

<template>
  <aside class="admin-sidebar">
    <div class="sidebar-brand">
      <h2>🏸 後台管理</h2>
    </div>
    <nav class="sidebar-nav">
      <RouterLink to="/admin/dashboard">📊 儀表板</RouterLink>
      <RouterLink to="/admin/members">👥 會員管理</RouterLink>
      <RouterLink to="/admin/venues">🏟️ 場館管理</RouterLink>
      <RouterLink to="/admin/courts">🏸 場地管理</RouterLink>
      <RouterLink to="/admin/bookings">📅 預約管理</RouterLink>
      <RouterLink to="/admin/products">📦 商品管理</RouterLink>
      <RouterLink to="/admin/orders">🧾 訂單管理</RouterLink>
      <RouterLink to="/admin/announcements">📢 公告管理</RouterLink>
      <RouterLink to="/admin/pickup-games">🤝 揪團管理</RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  width: 220px;
  background-color: #2c3e50;
  color: white;
  padding: 20px 0;
}

.sidebar-brand {
  padding: 0 20px 20px;
  border-bottom: 1px solid #3d566e;
}

.sidebar-brand h2 {
  margin: 0;
  font-size: 1.2rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
}

.sidebar-nav a {
  color: #bdc3c7;
  text-decoration: none;
  padding: 12px 20px;
  transition: background-color 0.2s;
}

.sidebar-nav a:hover,
.sidebar-nav a.router-link-active {
  background-color: #34495e;
  color: white;
}
</style>
