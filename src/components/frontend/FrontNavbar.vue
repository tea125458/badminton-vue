<script setup>
/**
 * 前台導覽列
 * - 左側：品牌名「羽過天晴」（漸層文字）
 * - 中間：預約球場 / 臨打揪團與報名 / 天晴商城 / 最新公告
 * - 右側：
 *   - 未登入 → 登入按鈕
 *   - 已登入 → 姓名 + 下拉選單（會員中心 / 登出）
 */
import { ref, watch } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const isLoggedIn = ref(false)
const memberName = ref('會員')

// 每次切換路由時重新讀取 localStorage
function checkLoginState() {
  const token = localStorage.getItem('memberToken')
  isLoggedIn.value = !!token
  try {
    const info = JSON.parse(localStorage.getItem('memberInfo'))
    memberName.value = info?.fullName || '會員'
  } catch {
    memberName.value = '會員'
  }
}

// 初始化 + 監聽路由變化
checkLoginState()
watch(() => route.path, checkLoginState)

function handleLogout() {
  localStorage.removeItem('memberToken')
  localStorage.removeItem('memberInfo')
  isLoggedIn.value = false
  router.push('/login')
}
</script>

<template>
  <nav class="navbar navbar-expand-lg front-navbar sticky-top">
    <div class="container">
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
        <div class="d-flex align-items-center gap-3">
          <!-- 未登入：顯示登入按鈕 -->
          <template v-if="!isLoggedIn">
            <RouterLink to="/login" class="btn btn-brand btn-sm">
              <i class="bi bi-box-arrow-in-right me-1"></i>登入
            </RouterLink>
          </template>

          <!-- 已登入：姓名 + 下拉選單 -->
          <template v-else>
            <div class="dropdown">
              <button
                class="btn btn-link text-decoration-none d-flex align-items-center gap-2 p-0 dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div class="avatar-circle">
                  <i class="bi bi-person-fill"></i>
                </div>
                <span class="text-dark fw-semibold d-none d-md-inline" style="font-size: 0.875rem;">
                  {{ memberName }}
                </span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2">
                <li>
                  <RouterLink to="/profile" class="dropdown-item py-2">
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
        </div>
      </div>
    </div>
  </nav>
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
</style>
