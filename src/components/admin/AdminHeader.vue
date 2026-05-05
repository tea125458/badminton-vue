<script setup>
// TODO: 顯示目前登入的管理員名稱、登出按鈕
</script>

<template>
  <header class="admin-header">
    <h1>管理後台</h1>
    <div class="header-actions">
      <span>管理員您好</span>
      <button @click="handleLogout">登出</button>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function handleLogout() {
  // TODO: 呼叫登出 API，清除登入狀態
  router.push('/admin/login')
}
</script>

<style scoped>
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #ecf0f1;
  border-bottom: 1px solid #ddd;
}

.admin-header h1 {
  margin: 0;
  font-size: 1.2rem;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-actions button {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background-color: #e74c3c;
  color: white;
  cursor: pointer;
}
</style>
