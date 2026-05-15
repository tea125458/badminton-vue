<script setup>
/**
 * 後台頂部導覽列
 * - 左側：頁面標題 / 麵包屑
 * - 右側：通知 + 管理員名字 + 登出按鈕
 */
import { useRouter, useRoute } from 'vue-router'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { adminApi } from '../../api/admin'

const router = useRouter()
const route = useRoute()
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
  '/admin/logs': '操作日誌',
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
})

async function handleLogout() {
  try {
    // 呼叫登出 API 以記錄日誌
    await adminApi.logout()
  } catch (e) {
    console.error('Logout API failed:', e)
  }
  
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

</style>
