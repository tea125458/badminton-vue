<script setup>
/**
 * 前台會員忘記密碼 / 重設密碼頁
 * 流程：輸入帳號 + Email → 發送驗證碼 → 輸入驗證碼 + 新密碼 → 完成
 */
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { memberApi } from '@/api/member'

const router = useRouter()

// 步驟：1=輸入帳號+Email, 2=輸入驗證碼+新密碼, 3=完成
const step = ref(1)
const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const username = ref('')
const email = ref('')
const verificationCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)

// 倒數計時（防止重複寄送）
const countdown = ref(0)
let countdownTimer = null

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

// Step 1：發送驗證碼
async function sendCode() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!username.value.trim()) { errorMsg.value = '請輸入帳號'; return }
  if (!email.value.trim()) { errorMsg.value = '請輸入 Email'; return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { errorMsg.value = 'Email 格式錯誤'; return }

  isLoading.value = true

  try {
    await memberApi.sendVerificationCode(username.value.trim(), email.value.trim())
    successMsg.value = '驗證碼已寄送至您的信箱，請查收！'
    step.value = 2
    startCountdown()
  } catch (err) {
    const msg = err.response?.data?.message
    errorMsg.value = msg || '發送失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}

// 重新發送驗證碼
async function resendCode() {
  if (countdown.value > 0) return
  errorMsg.value = ''
  successMsg.value = ''
  isLoading.value = true

  try {
    await memberApi.sendVerificationCode(username.value.trim(), email.value.trim())
    successMsg.value = '新的驗證碼已寄出！'
    startCountdown()
  } catch (err) {
    errorMsg.value = err.response?.data?.message || '發送失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}

// Step 2：驗證碼 + 新密碼提交
async function handleSubmit() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!verificationCode.value.trim()) { errorMsg.value = '請輸入驗證碼'; return }
  if (!newPassword.value) { errorMsg.value = '請輸入新密碼'; return }
  if (newPassword.value.length < 6) { errorMsg.value = '新密碼至少需要 6 個字元'; return }
  if (newPassword.value !== confirmPassword.value) { errorMsg.value = '兩次密碼輸入不一致'; return }

  isLoading.value = true

  try {
    await memberApi.resetPassword({
      username: username.value.trim(),
      email: email.value.trim(),
      code: verificationCode.value.trim(),
      newPassword: newPassword.value,
    })
    step.value = 3
  } catch (err) {
    const msg = err.response?.data?.message
    errorMsg.value = msg || '重設失敗，請檢查輸入內容'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="reset-page">
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-5 col-lg-4">

          <div class="reset-card card-rounded shadow-sm p-4">
            <!-- Header -->
            <div class="text-center mb-4">
              <div class="brand-icon-circle mx-auto mb-3">
                <i class="bi" :class="step === 3 ? 'bi-check-lg' : 'bi-key'"></i>
              </div>
              <h2 class="fw-bold text-gradient mb-1 fs-4">
                {{ step === 3 ? '重設成功' : '忘記密碼' }}
              </h2>
              <p class="text-muted small tracking-wider mb-0">
                {{ step === 1 ? '請輸入帳號與信箱以接收驗證碼' : step === 2 ? '請輸入驗證碼並設定新密碼' : '密碼已更新' }}
              </p>
            </div>

            <!-- 步驟指示 -->
            <div v-if="step !== 3" class="step-bar mb-4">
              <div class="step-item" :class="{ active: step >= 1 }">1. 發送驗證碼</div>
              <div class="step-divider"></div>
              <div class="step-item" :class="{ active: step >= 2 }">2. 重設密碼</div>
            </div>

            <!-- Error -->
            <div v-if="errorMsg" class="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span class="small">{{ errorMsg }}</span>
            </div>

            <!-- Success -->
            <div v-if="successMsg && step !== 3" class="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3" style="background-color: #ECFDF5; border-color: #A7F3D0; color: #059669;">
              <i class="bi bi-check-circle-fill"></i>
              <span class="small">{{ successMsg }}</span>
            </div>

            <!-- Step 1: 輸入帳號 + Email -->
            <form v-if="step === 1" @submit.prevent="sendCode">
              <div class="mb-3">
                <label class="form-label fw-semibold small text-secondary">
                  <i class="bi bi-person me-1"></i>帳號
                </label>
                <input v-model="username" type="text" class="form-control rounded-3"
                       placeholder="請輸入您的帳號" autocomplete="off" autofocus />
              </div>
              <div class="mb-4">
                <label class="form-label fw-semibold small text-secondary">
                  <i class="bi bi-envelope me-1"></i>電子信箱
                </label>
                <input v-model="email" type="email" class="form-control rounded-3"
                       placeholder="請輸入註冊時的 Email" />
              </div>
              <button type="submit" class="btn btn-brand w-100 py-3 fw-bold" :disabled="isLoading">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                <span v-if="isLoading">寄送中...</span>
                <span v-else><i class="bi bi-send me-2"></i>發送驗證碼</span>
              </button>
            </form>

            <!-- Step 2: 輸入驗證碼 + 設定新密碼 -->
            <form v-if="step === 2" @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label class="form-label fw-semibold small text-secondary">
                  <i class="bi bi-shield-lock me-1"></i>驗證碼
                </label>
                <div class="d-flex gap-2">
                  <input v-model="verificationCode" type="text" class="form-control rounded-3 verification-input"
                         placeholder="請輸入 6 位數驗證碼" maxlength="6" autofocus />
                  <button type="button" class="btn btn-outline-secondary rounded-3 text-nowrap"
                          :disabled="countdown > 0" @click="resendCode">
                    {{ countdown > 0 ? `${countdown}s` : '重寄' }}
                  </button>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small text-secondary">
                  <i class="bi bi-lock me-1"></i>新密碼
                </label>
                <div class="position-relative">
                  <input v-model="newPassword" :type="showPassword ? 'text' : 'password'"
                         class="form-control rounded-3" placeholder="請輸入新密碼（至少 6 位）"
                         style="padding-right: 48px;" />
                  <button type="button"
                          class="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary pe-3"
                          @click="showPassword = !showPassword" tabindex="-1">
                    <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
              </div>
              <div class="mb-4">
                <label class="form-label fw-semibold small text-secondary">
                  <i class="bi bi-lock-fill me-1"></i>確認新密碼
                </label>
                <input v-model="confirmPassword" type="password" class="form-control rounded-3"
                       placeholder="請再次輸入新密碼" />
              </div>
              <div class="d-flex gap-3">
                <button type="submit" class="btn btn-brand flex-fill py-3 fw-bold" :disabled="isLoading">
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                  <span v-if="isLoading">處理中...</span>
                  <span v-else><i class="bi bi-check-lg me-2"></i>確認重設</span>
                </button>
                <button type="button" class="btn btn-outline-secondary flex-fill py-3 fw-bold rounded-3"
                        @click="step = 1; errorMsg = ''; successMsg = ''">
                  <i class="bi bi-arrow-left me-2"></i>上一步
                </button>
              </div>
            </form>

            <!-- Step 3: 完成 -->
            <div v-if="step === 3" class="text-center">
              <div class="success-icon mx-auto mb-3">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <p class="text-muted mb-4">您的密碼已重設成功，請使用新密碼登入。</p>
              <RouterLink to="/login" class="btn btn-brand w-100 py-3 fw-bold">
                <i class="bi bi-box-arrow-in-right me-2"></i>前往登入
              </RouterLink>
            </div>

            <!-- Footer -->
            <div class="text-center mt-4 pt-3 border-top">
              <RouterLink to="/login" class="text-muted small text-decoration-none">
                <i class="bi bi-arrow-left me-1"></i>返回登入頁
              </RouterLink>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reset-page {
  min-height: calc(100vh - 160px);
  display: flex;
  align-items: center;
}

.reset-card {
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

/* 步驟指示 */
.step-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.step-item {
  font-size: 0.75rem;
  font-weight: 700;
  color: #CBD5E1;
  transition: color 0.3s;
}

.step-item.active {
  color: var(--brand-teal);
}

.step-divider {
  width: 2rem;
  height: 2px;
  background: #E2E8F0;
  border-radius: 1px;
}

.form-control:focus {
  border-color: var(--brand-teal);
  box-shadow: 0 0 0 0.2rem rgba(0, 180, 180, 0.15);
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

.success-icon {
  font-size: 3rem;
  color: #22C55E;
}

.verification-input::placeholder {
  font-weight: 400;
  opacity: 0.5;
}
</style>
