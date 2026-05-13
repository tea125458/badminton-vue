<script setup>
/**
 * 管理員登入頁面
 * - 呼叫 adminApi.login() 進行登入
 * - 登入成功後跳轉到會員管理頁
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'

const router = useRouter()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

// 一鍵登入帶入測試帳號
function quickFill() {
  username.value = 'admin01'
  password.value = 'admin123'
}

// 進入登入頁時清除舊的 Token（等同於登出）
localStorage.removeItem('adminToken')
localStorage.removeItem('adminInfo')

async function handleLogin() {
  // 前端驗證
  if (!username.value.trim() || !password.value.trim()) {
    errorMsg.value = '請輸入帳號和密碼'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const res = await adminApi.login(username.value.trim(), password.value)
    // 儲存 JWT Token 和管理員資訊到 localStorage
    localStorage.setItem('adminToken', res.token)
    localStorage.setItem('adminInfo', JSON.stringify(res.admin))
    router.push('/admin/members')
  } catch (err) {
    if (err.response?.status === 401) {
      errorMsg.value = '帳號或密碼錯誤，請重新輸入'
    } else {
      errorMsg.value = '無法連線到伺服器，請確認後端是否已啟動'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 居中登入卡片 -->
    <div class="login-card">
      <!-- 羽毛 icon -->
      <div class="card-icon">
        <i class="bi bi-feather"></i>
      </div>

      <h1 class="card-title">管理員登入</h1>
      <p class="card-desc">羽過天晴 羽球館管理系統</p>

      <!-- 錯誤提示 -->
      <div v-if="errorMsg" class="alert-error">
        <i class="bi bi-exclamation-circle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <form @submit.prevent="handleLogin">
        <!-- 帳號 -->
        <div class="form-group">
          <div class="input-wrapper">
            <i class="bi bi-person input-icon"></i>
            <input
              id="login-username"
              v-model="username"
              type="text"
              placeholder="帳號"
              autocomplete="username"
              :disabled="isLoading"
              @keydown.enter="$refs.pwdInput?.focus()"
            />
          </div>
        </div>

        <!-- 密碼 -->
        <div class="form-group">
          <div class="input-wrapper">
            <i class="bi bi-lock input-icon"></i>
            <input
              id="login-password"
              ref="pwdInput"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="密碼"
              autocomplete="current-password"
              :disabled="isLoading"
            />
            <button
              type="button"
              class="toggle-pwd"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
        </div>

        <!-- 登入按鈕 -->
        <button type="submit" class="btn-login" :disabled="isLoading">
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>登入</span>
        </button>

        <!-- 一鍵登入 -->
        <button type="button" class="btn-demo" @click="quickFill">
          <i class="bi bi-lightning-fill"></i> 測試帳號
        </button>
      </form>

      <!-- 底部連結 -->
      <div class="form-footer">
        <RouterLink to="/" class="back-link">
          <i class="bi bi-arrow-left"></i> 回到前台首頁
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   登入頁面 — 真實天空背景 + 居中卡片
   ============================================ */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('/images/sky-bg.png') center / cover no-repeat fixed;
  position: relative;
  padding: 1rem;
}

/* ----- 登入卡片 ----- */
.login-card {
  width: 100%;
  max-width: 380px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 1.5rem;
  padding: 2.5rem 2rem 2rem;
  box-shadow:
    0 8px 32px rgba(31, 38, 135, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
  text-align: center;
  animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ----- 頂部羽毛 Icon ----- */
.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 1rem;
  background: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  font-size: 1.6rem;
  color: #64748B;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0e73c5;
  margin-bottom: 0.25rem;
  letter-spacing: 0.03em;
}

.card-desc {
  font-size: 0.82rem;
  color: #94A3B8;
  margin-bottom: 1.75rem;
  font-weight: 500;
}

/* ----- 錯誤提示 ----- */
.alert-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  border-radius: 0.65rem;
  background: #FEF2F2;
  color: #EF4444;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 1rem;
  border: 1px solid #FEE2E2;
  animation: shake 0.4s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* ----- 表單欄位 ----- */
.form-group {
  margin-bottom: 0.75rem;
  text-align: left;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94A3B8;
  font-size: 0.9rem;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  padding: 0.78rem 1rem 0.78rem 2.6rem;
  border: 1px solid #E2E8F0;
  border-radius: 0.65rem;
  font-size: 0.9rem;
  color: #1E293B;
  background: #F1F5F9;
  transition: all 0.2s ease;
  outline: none;
}

.input-wrapper input::placeholder {
  color: #94A3B8;
  font-weight: 500;
}

.input-wrapper input:focus {
  border-color: #93C5FD;
  background: white;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.18);
}

.input-wrapper input:disabled {
  opacity: 0.6;
}

.toggle-pwd {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: #94A3B8;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.95rem;
  transition: color 0.2s ease;
}

.toggle-pwd:hover {
  color: #64748B;
}

/* ----- 登入按鈕 ----- */
.btn-login {
  width: 100%;
  padding: 0.78rem;
  border: none;
  border-radius: 0.65rem;
  background: linear-gradient(135deg, #3896cc, #30a2dc);
  color: white;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-top: 0.6rem;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(13, 148, 136, 0.3);
}

.btn-login:active:not(:disabled) {
  transform: translateY(0);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ----- Demo 按鈕 ----- */
.btn-demo {
  width: 100%;
  padding: 0.6rem;
  border: 1.5px dashed #CBD5E1;
  border-radius: 0.65rem;
  background: transparent;
  color: #64748B;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: all 0.2s ease;
}

.btn-demo:hover {
  background: rgba(241, 245, 249, 0.7);
  color: #1E293B;
  border-color: #94A3B8;
}

.btn-demo i {
  color: #FBBF24;
}

/* ----- Loading Spinner ----- */
.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ----- 底部連結 ----- */
.form-footer {
  text-align: center;
  margin-top: 1.5rem;
}

.back-link {
  color: #94A3B8;
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 600;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #475569;
}

/* ----- 響應式 ----- */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.5rem 1.5rem;
    margin: 0 0.5rem;
  }
}
</style>
