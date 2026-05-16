<script setup>
/**
 * 前台導覽列
 * - 左側：品牌名「羽過天晴」（漸層文字）
 * - 中間：預約球場 / 臨打揪團與報名 / 天晴商城 / 最新公告
 * - 右側：
 *   - 未登入 → 登入按鈕
 *   - 已登入 → 姓名 + 下拉選單（會員中心 / 登出）
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { memberApi } from '@/api/member'
import { useCartStore } from '@/stores/cart'
import { useMemberStore } from '@/stores/member'
import CartOffcanvas from '@/components/frontend/CartOffcanvas.vue'

const router = useRouter()
const route = useRoute()
// TODO: 等通知 store 建立後再啟用
// const notificationStore = useNotificationStore()
const cart = useCartStore()
const memberStore = useMemberStore()

// 使用 Pinia store 的 computed 屬性（自動同步）
const isLoggedIn = computed(() => memberStore.isLoggedIn)
const memberName = computed(() => memberStore.fullName)
const memberAvatar = computed(() => memberStore.avatar)
const showDropdown = ref(false)
const showCart = ref(false)

// 切換下拉選單
function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

// 點擊頁面其他地方時關閉下拉選單
function handleClickOutside(e) {
  const dropdown = document.querySelector('.user-dropdown')
  if (dropdown && !dropdown.contains(e.target)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // if (isLoggedIn.value) {
  //   notificationStore.connect()
  // }
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  // notificationStore.disconnect()
})




watch(() => route.path, () => {
  showDropdown.value = false
})

async function handleLogout() {
  try {
    // 呼叫登出 API 以記錄日誌
    await memberApi.logout()
  } catch (e) {
    console.error('Logout API failed:', e)
  }
  
  memberStore.logout()
  showDropdown.value = false
  // notificationStore.disconnect()
  router.push('/login')
}
</script>

<template>
  <nav class="navbar navbar-expand-lg front-navbar sticky-top">
    <div class="container-fluid px-lg-4">
      <!-- 品牌名稱 -->
      <RouterLink to="/" class="navbar-brand text-gradient">
        <i class="bi bi-feather me-2"></i>羽過天晴
      </RouterLink>

      <!-- 漢堡選單按鈕 (RWD) -->
      <button
        class="navbar-toggler border-0"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarMain"
        aria-controls="navbarMain"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <i class="bi bi-list fs-4"></i>
      </button>

      <!-- 導覽連結 -->
      <div class="collapse navbar-collapse" id="navbarMain">
        <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <RouterLink to="/" class="nav-link">首頁</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/booking" class="nav-link">預約球場</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/pickup" class="nav-link">臨打揪團與報名</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/products" class="nav-link">天晴商城</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/announcements" class="nav-link">最新公告</RouterLink>
          </li>
        </ul>

        <!-- 右側區塊 -->
        <div class="d-flex align-items-center gap-2">
          <!-- 未登入：顯示登入按鈕 -->
          <template v-if="!isLoggedIn">
            <RouterLink to="/login" class="btn btn-brand btn-sm">
              <i class="bi bi-box-arrow-in-right me-1"></i>登入
            </RouterLink>
          </template>

          <!-- 已登入：姓名 + 下拉選單 -->
          <template v-else>
            <!-- TODO: 小鈴鐺通知（等 notificationStore 建立後再啟用）-->

            <div class="user-dropdown" style="position: relative;">
              <button
                class="btn btn-link text-decoration-none d-flex align-items-center gap-2 p-0"
                type="button"
                @click.stop="toggleDropdown"
              >
                <div class="avatar-circle">
                  <img v-if="memberAvatar" :src="'http://localhost:8080' + memberAvatar" alt="頭像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
                  <i v-else class="bi bi-person-fill"></i>
                </div>
                <span class="text-dark fw-semibold d-none d-md-inline" style="font-size: 0.875rem;">
                  {{ memberName }}
                </span>
                <i class="bi bi-chevron-down" style="font-size: 0.6rem; color: #64748B;"></i>
              </button>
              <ul v-show="showDropdown" class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2 show" style="position: absolute; right: 0; top: 100%;">
                <li>
                  <RouterLink to="/profile" class="dropdown-item py-2" @click="showDropdown = false">
                    <i class="bi bi-person-circle me-2"></i>會員中心
                  </RouterLink>
                </li>
                <li><hr class="dropdown-divider" /></li>
                <li>
                  <button class="dropdown-item py-2 text-danger" @click="handleLogout">
                    <i class="bi bi-box-arrow-right me-2"></i>登出
                  </button>
                </li>
              </ul>
            </div>
          </template>

          <!-- 購物車圖示（不管登入與否都顯示） -->
          <button
            class="navbar-cart-btn"
            title="購物車"
            @click="showCart = true"
          >
            <i class="bi bi-cart3"></i>
            <span v-if="cart.count > 0" class="cart-count-badge">{{ cart.count }}</span>
          </button>
        </div>
      </div>
    </div>
  </nav>

  <!-- 購物車側邊欄（全域） -->
  <CartOffcanvas v-model="showCart" />
</template>

<style scoped>
.dropdown-toggle::after {
  margin-left: 0.25rem;
  font-size: 0.65rem;
}

.dropdown-menu {
  border-radius: 1rem;
  padding: 0.5rem;
  min-width: 180px;
}

.dropdown-item {
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.dropdown-item:active {
  background-color: var(--brand-teal);
}

.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.9rem;
}

/* 通知鈴鐺與選單樣式 */
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

/* 購物車數量 badge */
.cart-count-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #EF4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
}

/* 導覽列購物車按鈕（邊框樣式） */
.navbar-cart-btn {
  position: relative;
  background: transparent;
  border: 2px solid var(--brand-teal);
  border-radius: 0.6rem;
  color: var(--brand-teal);
  font-size: 1.1rem;
  width: 36px;
  height: 36px;
  margin-left: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.navbar-cart-btn:hover {
  background: var(--brand-teal);
  color: white;
}
</style>
