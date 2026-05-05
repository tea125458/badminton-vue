<script setup>
// TODO: 前台導覽列 — 首頁、商品、預約、揪團、會員登入/個人資料
</script>

<template>
  <nav class="front-navbar">
    <RouterLink to="/" class="brand">🏸 羽球訂場系統</RouterLink>
    <div class="nav-links">
      <RouterLink to="/">首頁</RouterLink>
      <RouterLink to="/products">商品</RouterLink>
      <RouterLink to="/booking">預約場地</RouterLink>
      <RouterLink to="/pickup">揪團</RouterLink>
      <RouterLink to="/login">登入</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.front-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background-color: #2c3e50;
  color: white;
}

.brand {
  font-size: 1.3rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-links a {
  color: #bdc3c7;
  text-decoration: none;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: white;
}
</style>
