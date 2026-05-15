<script setup>
/**
 * 前台導覽列
 * - 左側：品牌名「羽過天晴」（漸層文字）
 * - 中間：預約球場 / 臨打揪團與報名 / 天晴商城 / 最新公告
 * - 右側：
 *   - 未登入 → 登入按鈕
 *   - 已登入 → 姓名 + 下拉選單（會員中心 / 登出）
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { memberApi } from '@/api/member'

const router = useRouter()
const route = useRoute()

const isLoggedIn = ref(false)
const memberName = ref('會員')
const memberAvatar = ref(null)
const showDropdown = ref(false)

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

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// 每次切換路由時重新讀取 localStorage
function checkLoginState() {
  const token = localStorage.getItem('memberToken')
  isLoggedIn.value = !!token
  try {
    const info = JSON.parse(localStorage.getItem('memberInfo'))
    memberName.value = info?.fullName || '會員'
    memberAvatar.value = info?.profilePicture || null
  } catch {
    memberName.value = '會員'
    memberAvatar.value = null
  }
}

// 初始化 + 監聽路由變化
checkLoginState()
watch(() => route.path, () => {
  checkLoginState()
  showDropdown.value = false  // 換頁時關閉選單
})

async function handleLogout() {
  try {
    // 呼叫登出 API 以記錄日誌
    await memberApi.logout()
  } catch (e) {
    console.error('Logout API failed:', e)
  }
  
  localStorage.removeItem('memberToken')
  localStorage.removeItem('memberInfo')
  isLoggedIn.value = false
  showDropdown.value = false
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
        <div class="d-flex align-items-center gap-3">
          <!-- 未登入：顯示登入按鈕 -->
          <template v-if="!isLoggedIn">
            <RouterLink to="/login" class="btn btn-brand btn-sm">
              <i class="bi bi-box-arrow-in-right me-1"></i>登入
            </RouterLink>
          </template>

          <!-- 已登入：姓名 + 下拉選單 -->
          <template v-else>
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
