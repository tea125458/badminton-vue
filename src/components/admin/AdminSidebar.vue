<script setup>
/**
 * 後台側邊欄
 * 分為 6 個區塊：
 * 1. 會員管理
 * 2. 場館 + 場地管理
 * 3. 預約 + 揪團管理
 * 4. 商品 + 訂單管理
 * 5. 公告管理
 * 6. 統計數據（儀表板）
 */
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isCollapsed = ref(false)

// 從 localStorage 取得目前登入者的角色
const currentRole = computed(() => {
  try {
    const info = localStorage.getItem('adminInfo')
    return info ? JSON.parse(info).role : null
  } catch { return null }
})

const menuGroups = [
  {
    label: '會員管理',
    items: [
      { icon: 'bi-people', label: '會員管理', to: '/admin/members' },
      { icon: 'bi-person-badge', label: '職員管理', to: '/admin/admins', requiredRole: 'MANAGER' },
    ],
  },
  {
    label: '場館與場地',
    items: [
      { icon: 'bi-building', label: '場館管理', to: '/admin/venues' },
      { icon: 'bi-columns-gap', label: '場地管理', to: '/admin/courts' },
    ],
  },
  {
    label: '預約與揪團',
    items: [
      { icon: 'bi-calendar-check', label: '預約管理', to: '/admin/bookings' },
      { icon: 'bi-person-arms-up', label: '揪團管理', to: '/admin/pickup-games' },
    ],
  },
  {
    label: '商品與訂單',
    items: [
      { icon: 'bi-box-seam', label: '商品管理', to: '/admin/products' },
      { icon: 'bi-receipt', label: '訂單管理', to: '/admin/orders' },
    ],
  },
  {
    label: '內容管理',
    items: [
      { icon: 'bi-megaphone', label: '公告管理', to: '/admin/announcements' },
    ],
  },
  {
    label: '統計數據',
    items: [
      { icon: 'bi-bar-chart-line', label: '數據儀表板', to: '/admin/dashboard' },
    ],
  },
]
</script>

<template>
  <aside class="admin-sidebar" :class="{ collapsed: isCollapsed }">
    <!-- 品牌區 -->
    <div class="sidebar-brand">
      <RouterLink to="/admin/dashboard" class="d-flex align-items-center gap-2 text-decoration-none">
        <div class="brand-icon">
          <i class="bi bi-feather"></i>
        </div>
        <span v-if="!isCollapsed" class="brand-text">羽過天晴</span>
      </RouterLink>
    </div>

    <!-- 選單區 -->
    <nav class="sidebar-nav">
      <div v-for="group in menuGroups" :key="group.label" class="nav-group">
        <div v-if="!isCollapsed" class="nav-group-label">{{ group.label }}</div>

        <RouterLink
          v-for="item in group.items.filter(i => !i.requiredRole || i.requiredRole === currentRole)"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: route.path === item.to }"
        >
          <i :class="['bi', item.icon]"></i>
          <span v-if="!isCollapsed">{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <!-- 底部：收合按鈕 -->
    <div class="sidebar-footer">
      <button class="collapse-btn" @click="isCollapsed = !isCollapsed">
        <i :class="isCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left'"></i>
        <span v-if="!isCollapsed">收合選單</span>
      </button>

      <RouterLink to="/" class="nav-item mt-2" v-if="!isCollapsed">
        <i class="bi bi-box-arrow-left"></i>
        <span>回到前台</span>
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  width: 280px;
  min-height: 100vh;
  background: white;
  border-right: 1px solid #F1F5F9;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow-y: auto;
}

.admin-sidebar.collapsed {
  width: 72px;
}

/* ----- 品牌區 ----- */
.sidebar-brand {
  padding: 1.25rem;
  border-bottom: 1px solid #F1F5F9;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  flex-shrink: 0;
}

.brand-text {
  font-weight: 800;
  font-size: 1.25rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ----- 選單區 ----- */
.sidebar-nav {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
}

.nav-group {
  padding: 0.25rem 0;
}

.nav-group + .nav-group {
  border-top: 1px solid #F1F5F9;
  margin-top: 0.25rem;
  padding-top: 0.5rem;
}

.nav-group-label {
  padding: 0.6rem 1.5rem 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748B;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1.5rem;
  margin: 0.15rem 0.6rem;
  border-radius: 0.75rem;
  color: #334155;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.nav-item i {
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.nav-item:hover {
  background-color: #F0F9FF;
  color: var(--brand-sky);
}

.nav-item.active {
  background-color: var(--brand-sky);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
}

/* ----- 收合狀態 ----- */
.collapsed .nav-item {
  justify-content: center;
  padding: 0.7rem;
  margin: 0.15rem 0.35rem;
}

.collapsed .nav-item i {
  font-size: 1.2rem;
}

.collapsed .nav-group-label {
  display: none;
}

.collapsed .sidebar-brand {
  padding: 1.25rem 0.75rem;
  display: flex;
  justify-content: center;
}

/* ----- 底部 ----- */
.sidebar-footer {
  padding: 0.75rem 0.5rem;
  border-top: 1px solid #F1F5F9;
  margin-top: auto;
}

.collapse-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 1.25rem;
  border: none;
  background: none;
  border-radius: 0.75rem;
  color: #94A3B8;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background-color: #F1F5F9;
  color: #64748B;
}

.collapsed .collapse-btn {
  justify-content: center;
  padding: 0.7rem;
}
</style>
