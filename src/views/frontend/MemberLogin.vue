<script setup>
/**
 * 前台會員登入頁
 * 使用前台 Vue 設計系統：Bootstrap + 品牌色彩
 * - 串接 memberApi.login() (JWT)
 * - 登入成功後儲存 token 到 localStorage
 */
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { memberApi } from '@/api/member'
import { useMemberStore } from '@/stores/member'

const router = useRouter()
const route = useRoute()
const memberStore = useMemberStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const showPassword = ref(false)

// 一鍵登入帶入測試帳號
function quickFill() {
  username.value = 'chen.weijie'
  password.value = 'pass123'
}

onMounted(() => {
  if (route.query.registered) {
    successMsg.value = '註冊成功！請使用新帳號登入'
    // 清除 URL 參數以免重整一直出現
    router.replace('/login')
  }
})

// 進入登入頁時清除舊的 Token（等同於登出）
memberStore.logout()

async function handleLogin() {
  if (!username.value.trim() || !password.value.trim()) {
    errorMsg.value = '請輸入帳號和密碼'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const res = await memberApi.login(username.value.trim(), password.value)
    memberStore.login(res.token, res.member)
    router.push('/')
  } catch (err) {
    if (err.response?.status === 401) {
      errorMsg.value = '帳號或密碼錯誤，請重新輸入'
    } else {
      errorMsg.value = '系統連線異常，請稍後再試'
    }
  } finally {
    isLoading.value = false
  }
}

// 處理 Google 登入成功的回呼
async function handleGoogleLogin(response) {
  try {
    isLoading.value = true
    errorMsg.value = ''
    
    // 將 Google 提供的 credential 送到後端驗證並登入/註冊
    const res = await memberApi.googleLogin(response.credential)
    
    localStorage.setItem('memberToken', res.token)
    localStorage.setItem('memberInfo', JSON.stringify(res.member))
    memberStore.login(res.token, res.member)
    router.push('/')
  } catch (err) {
    console.error('Google 登入失敗:', err)
    errorMsg.value = err.response?.data?.message || 'Google 登入失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="container py-4"> <!-- 上下間距設為相同 -->
      <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">

          <!-- 登入卡片 -->
          <div class="login-card card-rounded shadow-sm py-5 px-4">
            <!-- Header -->
            <div class="text-center mb-2">
              <div class="brand-icon-circle mx-auto mb-2">
                <i class="bi bi-feather"></i>
              </div>
              <h2 class="fw-bold text-gradient mb-1">會員登入</h2>
              <p class="text-muted small tracking-wider mb-0">BADMINTON MEMBER LOGIN</p>
            </div>

            <!-- Error Message -->
            <div v-if="errorMsg" class="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3" role="alert">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span class="small">{{ errorMsg }}</span>
            </div>

            <!-- Success Message -->
            <div v-if="successMsg" class="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3" role="alert" style="background-color: #ECFDF5; border-color: #A7F3D0; color: #059669;">
              <i class="bi bi-check-circle-fill"></i>
              <span class="small fw-bold">{{ successMsg }}</span>
            </div>

            <!-- Login Form -->
            <form @submit.prevent="handleLogin">
              <div class="mb-2">
                <label class="form-label fw-semibold small text-secondary">
                  帳號
                </label>
                <input
                  v-model="username"
                  type="text"
                  class="form-control rounded-3"
                  placeholder="請輸入您的帳號"
                  autocomplete="off"
                  autofocus
                />
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold small text-secondary">
                  密碼
                </label>
                <div class="position-relative">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    class="form-control rounded-3"
                    placeholder="請輸入您的密碼"
                    autocomplete="current-password"
                    style="padding-right: 48px;"
                  />
                  <button
                    type="button"
                    class="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary pe-3"
                    @click="showPassword = !showPassword"
                    tabindex="-1"
                  >
                    <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
              </div>

              <button type="submit" class="btn btn-brand w-100 py-2 fw-bold" :disabled="isLoading">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                <span v-if="isLoading">登入中...</span>
                <span v-else><i class="bi bi-box-arrow-in-right me-2"></i>登入</span>
              </button>

              <button type="button" class="btn btn-outline-secondary w-100 mt-2 py-1 fw-semibold border-dashed" @click="quickFill">
                <i class="bi bi-lightning-fill text-warning me-1"></i>測試帳號
              </button>
            </form>

            <div class="d-flex align-items-center my-2">
              <hr class="flex-grow-1 text-muted">
              <span class="mx-2 text-muted small">或</span>
              <hr class="flex-grow-1 text-muted">
            </div>

            <!-- Google Login Button -->
            <div class="d-flex justify-content-center">
              <GoogleLogin :callback="handleGoogleLogin" prompt />
            </div>

            <!-- 忘記密碼 -->
            <div class="text-center mt-3">
              <RouterLink to="/reset-password" class="forgot-link small text-decoration-none">
                忘記密碼？
              </RouterLink>
            </div>

            <!-- Footer -->
            <div class="text-center mt-2 pt-2 border-top">
              <span class="text-muted small">還不是會員？</span>
              <RouterLink to="/register" class="register-link fw-bold small text-decoration-none ms-1">
                立即註冊
              </RouterLink>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: auto;
  display: flex;
  align-items: center;
}

.login-card {
  background: white;
  animation: fadeUp 0.4s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.brand-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.form-control:focus {
  border-color: var(--brand-teal);
  box-shadow: 0 0 0 0.2rem rgba(0, 180, 180, 0.15);
}

.form-control::placeholder {
  font-size: 0.9rem;
}

.border-dashed {
  border-style: dashed !important;
  border-width: 2px !important;
}

.alert-danger {
  background-color: #FEF2F2;
  border: 1px solid #FECACA;
  color: #DC2626;
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.forgot-link, .register-link {
  color: #14b8a6; /* 帶有一點藍色調的活力湖水綠 */
  transition: color 0.2s, opacity 0.2s;
}

.forgot-link {
  font-weight: 600;
}

.forgot-link:hover, .register-link:hover {
  opacity: 0.7;
  color: var(--brand-teal);
  text-decoration: none !important;
}
</style>
