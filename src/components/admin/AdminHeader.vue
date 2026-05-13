<script setup>
/**
 * 後台頂部導覽列
 * - 左側：頁面標題 / 麵包屑
 * - 右側：通知 + 管理員名字 + 登出按鈕
 */
import { useRouter, useRoute } from 'vue-router'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '../../stores/notificationStore'

const router = useRouter()
const route = useRoute()
const notificationStore = useNotificationStore()

// 頁面標題映射
const pageTitles = {
  '/admin/dashboard': '數據儀表板',
  '/admin/members': '會員管理',
  '/admin/admins': '職員管理',
  '/admin/venues': '場館管理',
  '/admin/courts': '場地管理',
  '/admin/bookings': '預約管理',
  '/admin/pickup-games': '揪團管理',
  '/admin/products': '商品管理',
  '/admin/orders': '訂單管理',
  '/admin/announcements': '公告管理',
}

const currentTitle = computed(() => pageTitles[route.path] || '管理後台')

const adminName = ref('管理員')

onMounted(() => {
  try {
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'))
    if (adminInfo) {
      adminName.value = adminInfo.fullName || adminInfo.username || '管理員'
    }
  } catch (e) {
    console.error('Failed to parse adminInfo from localStorage', e)
  }

  // 啟動 WebSocket 連線
  notificationStore.connect()
})

onUnmounted(() => {
  // 元件銷毀時斷開連線
  notificationStore.disconnect()
})

function handleLogout() {
  // TODO: 呼叫登出 API，清除登入狀態
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminInfo')
  router.push('/admin/login')
}
</script>

<template>
  <header class="admin-header">
    <div class="d-flex align-items-center gap-3">
      <h1 class="header-title">{{ currentTitle }}</h1>
    </div>

    <div class="d-flex align-items-center gap-3">
      <!-- 通知 -->
      <div class="dropdown">
        <button class="btn btn-icon" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside">
          <i class="bi bi-bell"></i>
          <span v-if="notificationStore.unreadCount > 0" class="notification-dot"></span>
        </button>
        
        <ul class="dropdown-menu dropdown-menu-end shadow-sm notification-menu">
          <li><h6 class="dropdown-header">系統通知 ({{ notificationStore.unreadCount }})</h6></li>
          
          <li v-if="notificationStore.unreadCount === 0">
            <span class="dropdown-item text-muted text-center py-3">目前沒有新通知</span>
          </li>
          
          <div class="notification-list">
            <li v-for="n in notificationStore.notifications" :key="n.id">
              <div class="dropdown-item notification-item">
                <strong class="d-block text-truncate">{{ n.title }}</strong>
                <p class="mb-1 text-muted small text-wrap">{{ n.content }}</p>
                <small class="text-secondary">{{ new Date(n.time).toLocaleString() }}</small>
              </div>
            </li>
          </div>
          
          <li><hr class="dropdown-divider"></li>
          <li>
            <button class="dropdown-item text-center text-primary py-2 fw-bold" @click="notificationStore.clearAll()">
              全部標示為已讀
            </button>
          </li>
        </ul>
      </div>

      <!-- 管理員資訊 (點擊前往個人中心) -->
      <RouterLink to="/admin/profile" class="admin-info text-decoration-none">
        <div class="admin-avatar" title="個人中心">
          <i class="bi bi-person-gear"></i>
        </div>
        <span class="admin-name d-none d-md-inline">{{ adminName }} 您好</span>
      </RouterLink>

      <!-- 登出 -->
      <button class="btn btn-logout" @click="handleLogout">
        <i class="bi bi-box-arrow-right me-1"></i>
        <span class="d-none d-md-inline">登出</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background-color: white;
  border-bottom: 1px solid #F1F5F9;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--brand-dark);
}

.btn-icon {
  position: relative;
  width: 38px;
  height: 38px;
  border: none;
  background: #F8FAFC;
  border-radius: 0.75rem;
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: #F0F9FF;
  color: var(--brand-sky);
}

.btn-icon i {
  font-size: 1.1rem;
}

.notification-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background-color: #EF4444;
  border-radius: 50%;
  border: 2px solid white;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.admin-info:hover {
  opacity: 0.8;
}

.admin-avatar {
  width: 36px;
  height: 36px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #F0F9FF, #E0F2FE);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-sky);
  font-size: 1rem;
  transition: transform 0.2s;
}

.admin-info:hover .admin-avatar {
  transform: scale(1.05);
}

.admin-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.btn-logout {
  padding: 0.4rem 0.9rem;
  border: 1px solid #FEE2E2;
  background: #FEF2F2;
  color: #EF4444;
  border-radius: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: #EF4444;
  color: white;
  border-color: #EF4444;
}

/* 通知選單樣式 */
.notification-menu {
  width: 320px;
  padding: 0;
  border: none;
  border-radius: 0.75rem;
}

.notification-list {
  max-height: 350px;
  overflow-y: auto;
}

.notification-item {
  white-space: normal;
  border-bottom: 1px solid #f1f5f9;
  padding: 0.75rem 1rem;
  cursor: default;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:active {
  background-color: transparent;
  color: inherit;
}
</style>
