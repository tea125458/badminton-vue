<script setup>
/**
 * 前台會員註冊頁
 * 使用 Vue 前台設計系統：Bootstrap + 品牌色彩
 * 欄位：帳號、密碼、姓名、性別、生日、電話、Email
 */
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { memberApi } from '@/api/member'
import { useMemberStore } from '@/stores/member'

const router = useRouter()
const memberStore = useMemberStore()

const step = ref(1) // 1: 填寫資料, 2: 輸入驗證碼
const verificationCode = ref('')
const successMsg = ref('')

let countdownTimer = null
const countdown = ref(0)

function startCountdown() {
  countdown.value = 120
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

const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  gender: '男',
  birthday: '2000-01-01',
  phone: '',
  email: '',
})
const isLoading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

const registerAvatarFile = ref(null)
const registerAvatarPreview = ref(null)

function triggerRegisterAvatar() {
  document.getElementById('registerAvatarInput').click()
}

function handleRegisterAvatarChange(event) {
  const file = event.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '請選擇圖片檔案'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = '圖片大小不能超過 2MB'
    return
  }
  registerAvatarFile.value = file
  registerAvatarPreview.value = URL.createObjectURL(file)
}

// 取得今天的日期字串 (YYYY-MM-DD)，用於限制 HTML 日期選擇器最大值
const todayDate = new Date().toISOString().split('T')[0]

// 電話格式化
function formatPhone() {
  let v = form.value.phone.replace(/\D/g, '')
  if (v.length > 10) v = v.substring(0, 10)
  let f = ''
  if (v.length > 0) f = v.substring(0, 4)
  if (v.length > 4) f += '-' + v.substring(4, 7)
  if (v.length > 7) f += '-' + v.substring(7, 10)
  form.value.phone = f
}

// 一鍵帶入 Demo 資料 (正式發表用)
function fillDemoData() {
  form.value = {
    username: 'hsuanhsu',
    password: 'pass123',
    confirmPassword: 'pass123',
    fullName: '許萱',
    gender: '女',
    birthday: '1992-08-25',
    phone: '0910-555-888',
    email: 'starry1470@gmail.com',
    profilePicture: '/profile_pictures/4.png',
  }
  // 設定大頭貼預覽 (直接用後端靜態路徑)
  registerAvatarPreview.value = 'http://localhost:8080/profile_pictures/4.png'
}

// 送出第一步，發送驗證信
async function handleNextStep() {
  const d = form.value
  if (!d.username || !d.password || !d.fullName || !d.birthday || !d.phone || !d.email) {
    errorMsg.value = '請填寫所有欄位'
    return
  }
  
  if (!/^[A-Za-z0-9]{6,15}$/.test(d.username)) {
    errorMsg.value = '帳號必須為 6-15 碼'
    return
  }
  if (d.password.length < 6 || d.password.length > 15) {
    errorMsg.value = '密碼必須為 6-15 碼'
    return
  }
  if (d.password !== d.confirmPassword) {
    errorMsg.value = '兩次輸入的密碼不一致'
    return
  }
  const phoneDigits = d.phone.replace(/\D/g, '')
  if (phoneDigits.length !== 10 || !phoneDigits.startsWith('09')) {
    errorMsg.value = '手機號碼格式錯誤，需為 09 開頭的 10 位數字'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errorMsg.value = 'Email 格式錯誤'
    return
  }

  // 驗證生日不可為未來日期
  if (d.birthday > todayDate) {
    errorMsg.value = '生日不可為未來的日期'
    return
  }

  errorMsg.value = ''
  successMsg.value = ''
  isLoading.value = true

  try {
    // 發送註冊驗證信
    await memberApi.sendRegisterCode(d.email, d.username)
    successMsg.value = '驗證碼已寄送至您的信箱，請查收！'
    step.value = 2
    startCountdown()
  } catch (err) {
    const msg = err.response?.data
    errorMsg.value = msg?.message || (typeof msg === 'string' ? msg : '驗證碼寄送失敗，請稍後再試')
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
    await memberApi.sendRegisterCode(form.value.email, form.value.username)
    successMsg.value = '驗證碼已重新寄送！'
    startCountdown()
  } catch (err) {
    const msg = err.response?.data
    errorMsg.value = msg?.message || (typeof msg === 'string' ? msg : '驗證碼寄送失敗')
  } finally {
    isLoading.value = false
  }
}

// 提交註冊
async function handleRegister() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!verificationCode.value || verificationCode.value.length !== 6) {
    errorMsg.value = '請輸入完整的 6 位數驗證碼'
    return
  }

  isLoading.value = true
  try {
    const res = await memberApi.register(form.value, verificationCode.value)
    
    // 註冊成功，如果有選擇大頭貼，接著上傳
    if (registerAvatarFile.value && res.token) {
      try {
        // 先存 token，上傳 API 需要認證
        localStorage.setItem('memberToken', res.token)
        localStorage.setItem('memberInfo', JSON.stringify(res.member))
        
        const uploadRes = await memberApi.uploadAvatar(registerAvatarFile.value)
        // 上傳成功後，更新 memberInfo 裡的大頭貼路徑
        const info = JSON.parse(localStorage.getItem('memberInfo') || '{}')
        info.profilePicture = uploadRes.imageUrl
        localStorage.setItem('memberInfo', JSON.stringify(info))
      } catch (uploadErr) {
        console.error('註冊時上傳大頭貼失敗', uploadErr)
      }
    }

    // 註冊成功後，切換到 Step 3 成功畫面
    step.value = 3
  } catch (err) {
    // 直接顯示後端回傳的真實錯誤訊息
    const msg = err.response?.data
    if (typeof msg === 'string') {
      errorMsg.value = msg
    } else {
      errorMsg.value = msg?.message || '註冊失敗，請確認驗證碼或輸入內容'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="container py-4 d-flex justify-content-center">
      <!-- 註冊卡片 -->
      <div class="register-card card-rounded shadow-sm">
            <!-- Header -->
            <div class="text-center mb-2 position-relative">
              <h2 class="fw-bold text-gradient mb-0 fs-3">
                {{ step === 3 ? '註冊成功' : '會員註冊' }}
              </h2>
              <p class="text-muted small tracking-wider mb-0" style="font-size: 0.7rem;">
                {{ step === 3 ? 'ACCOUNT CREATED' : 'CREATE YOUR ACCOUNT' }}
              </p>
            </div>

            <!-- Alert Messages -->
            <div v-if="successMsg" class="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-3" style="background-color: #ECFDF5; border-color: #A7F3D0; color: #059669;">
              <i class="bi bi-check-circle-fill"></i>
              <span class="small">{{ successMsg }}</span>
            </div>
            <div v-if="errorMsg" class="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-3">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span class="small">{{ errorMsg }}</span>
            </div>

            <!-- Step 1 Form -->
            <form v-if="step === 1" @submit.prevent="handleNextStep">
              
              <!-- 大頭貼上傳 -->
              <div class="d-flex flex-column align-items-center mb-2">
                <div
                  class="register-avatar-upload"
                  @click="triggerRegisterAvatar"
                  title="上傳大頭貼"
                >
                  <img
                    v-if="registerAvatarPreview"
                    :src="registerAvatarPreview"
                    alt="預覽"
                    class="avatar-img"
                  />
                  <div v-else class="empty-avatar">
                    <i class="bi bi-camera-fill"></i>
                  </div>
                  <div v-if="registerAvatarPreview" class="avatar-overlay">
                    <i class="bi bi-camera-fill"></i>
                    <span>編輯</span>
                  </div>
                </div>
                <input
                  type="file"
                  id="registerAvatarInput"
                  accept="image/*"
                  class="d-none"
                  @change="handleRegisterAvatarChange"
                />
                <span class="fw-semibold text-secondary mt-1" style="font-size: 0.75rem;">請上傳大頭貼</span>
              </div>
              <div class="row mb-2">
                <div class="col-7">
                  <label class="form-label fw-semibold small text-secondary">
                    姓名
                  </label>
                  <input v-model="form.fullName" type="text" class="form-control rounded-3"
                         placeholder="請輸入姓名" />
                </div>
                <div class="col-5">
                  <label class="form-label fw-semibold small text-secondary">
                    性別
                  </label>
                  <div class="d-flex gap-3 pt-1">
                    <label class="form-check-label d-flex align-items-center gap-1">
                      <input v-model="form.gender" type="radio" value="男" class="form-check-input" /> 男
                    </label>
                    <label class="form-check-label d-flex align-items-center gap-1">
                      <input v-model="form.gender" type="radio" value="女" class="form-check-input" /> 女
                    </label>
                  </div>
                </div>
              </div>

              <div class="mb-2">
                <label class="form-label fw-semibold small text-secondary">
                  設定帳號
                </label>
                <input v-model="form.username" type="text" class="form-control rounded-3"
                       placeholder="請輸入 6-15 碼" maxlength="15" autocomplete="off" autofocus />
              </div>

              <div class="mb-2">
                <label class="form-label fw-semibold small text-secondary">
                  設定密碼
                </label>
                <div class="position-relative">
                  <input v-model="form.password" :type="showPassword ? 'text' : 'password'"
                         class="form-control rounded-3" placeholder="請輸入 6-15 碼" maxlength="15"
                         autocomplete="new-password" style="padding-right: 48px;" />
                  <button type="button"
                          class="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary pe-3"
                          @click="showPassword = !showPassword" tabindex="-1">
                    <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
              </div>

              <div class="mb-2">
                <label class="form-label fw-semibold small text-secondary">
                  確認密碼
                </label>
                <div class="position-relative">
                  <input v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'"
                         class="form-control rounded-3" placeholder="請再次輸入密碼" maxlength="12"
                         autocomplete="new-password" />
                </div>
                <!-- 即時密碼驗證提示 -->
                <div v-if="form.confirmPassword" class="mt-1 px-1">
                  <span v-if="form.password === form.confirmPassword" class="text-success small fw-bold">
                    <i class="bi bi-check-circle-fill me-1"></i>密碼一致
                  </span>
                  <span v-else class="text-danger small fw-bold">
                    <i class="bi bi-x-circle-fill me-1"></i>密碼不一致
                  </span>
                </div>
              </div>


              <div class="row mb-2">
                <div class="col-6">
                  <label class="form-label fw-semibold small text-secondary">
                    生日
                  </label>
                  <input v-model="form.birthday" type="date" class="form-control rounded-3 px-2" :max="todayDate" @click="$event.target.showPicker()" />
                </div>
                <div class="col-6">
                  <label class="form-label fw-semibold small text-secondary">
                    手機號碼
                  </label>
                  <input v-model="form.phone" type="text" class="form-control rounded-3"
                         placeholder="0912-345-678" maxlength="12" @input="formatPhone" />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold small text-secondary">
                  電子信箱
                </label>
                <input v-model="form.email" type="email" class="form-control rounded-3"
                       placeholder="example@mail.com" />
              </div>

              <button type="submit" class="btn btn-brand w-100 py-2 fw-bold mt-1" :disabled="isLoading">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                <span v-if="isLoading">處理中...</span>
                <span v-else>下一步 <i class="bi bi-arrow-right ms-1"></i></span>
              </button>
            </form>

            <!-- Step 2 Form (驗證碼) -->
            <form v-if="step === 2" @submit.prevent="handleRegister">
              <div class="mb-3 text-center">
                <div class="text-muted small mb-2">已發送驗證碼至：</div>
                <div class="fw-bold text-dark">{{ form.email }}</div>
              </div>

              <div class="mb-4">
                <label class="form-label fw-semibold small text-secondary">
                  <i class="bi bi-shield-lock me-1"></i>驗證碼
                </label>
                <div class="d-flex gap-2">
                  <input v-model="verificationCode" type="text" class="form-control rounded-3 verification-input"
                         placeholder="請輸入 6 位數驗證碼" maxlength="6" autofocus />
                  <button type="button" class="btn btn-outline-secondary rounded-3 text-nowrap px-3"
                          :disabled="countdown > 0" @click="resendCode">
                    {{ countdown > 0 ? `${countdown}s` : '重寄' }}
                  </button>
                </div>
              </div>

              <div class="d-flex gap-3">
                <button type="button" class="btn btn-outline-secondary flex-fill py-2 fw-bold rounded-3"
                        @click="step = 1; errorMsg = ''; successMsg = ''">
                  上一步
                </button>
                <button type="submit" class="btn btn-brand flex-fill py-2 fw-bold rounded-3" :disabled="isLoading">
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                  <span v-if="isLoading">驗證中...</span>
                  <span v-else>確認註冊</span>
                </button>
              </div>
            </form>

            <!-- Step 3: 完成 -->
            <div v-if="step === 3" class="text-center mt-4">
              <div class="success-icon mx-auto mb-3" style="font-size: 3rem; color: #22C55E;">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <p class="text-muted mb-4 fw-bold">歡迎加入羽過天晴羽球館！</p>
              <RouterLink to="/login" class="btn btn-brand w-100 py-3 fw-bold rounded-3">
                前往登入
              </RouterLink>
            </div>

            <!-- Footer -->
            <div v-if="step === 1" class="text-center mt-2 pt-2 border-top">
              <div class="mb-2">
                <span class="text-muted small">已經有帳號了？</span>
                <RouterLink to="/login" class="login-link fw-bold small text-decoration-none ms-1">
                  返回登入
                </RouterLink>
              </div>
              <div>
                <button 
                  type="button" 
                  class="btn btn-sm p-0 small fw-bold" 
                  style="color: #48b4e0; text-decoration: none;"
                  @click="fillDemoData"
                >
                  一鍵輸入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background-image: url('@/assets/images/login-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.register-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.4);
  z-index: 0;
}

.register-page > * {
  position: relative;
  z-index: 1;
}

.register-card {
  width: 100%;
  max-width: 480px;
  background: white;
  animation: fadeUp 0.4s ease;
  padding: 3rem 2.8rem 2.5rem;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}


.form-control:focus {
  border-color: var(--brand-teal);
  box-shadow: 0 0 0 0.2rem rgba(0, 180, 180, 0.15);
}

.form-check-input:checked {
  background-color: var(--brand-teal);
  border-color: var(--brand-teal);
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

.login-link {
  color: #14b8a6;
  transition: opacity 0.2s;
}

.login-link:hover {
  opacity: 0.7;
  color: #14b8a6;
  text-decoration: none !important;
}

/* 修正日期輸入框內部的文字間距 */
input[type="date"]::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
}
input[type="date"]::-webkit-datetime-edit-year-field,
input[type="date"]::-webkit-datetime-edit-month-field,
input[type="date"]::-webkit-datetime-edit-day-field {
  padding: 0 1px;
}
input[type="date"]::-webkit-datetime-edit-text {
  padding: 0 2px;
}

/* ============================
   註冊大頭貼上傳 (虛線背景 + 上傳後有遮罩)
   ============================ */
.register-avatar-upload {
  width: 65px;
  height: 65px;
  border-radius: 50%;
  background: #f8fafc;
  border: 2px dashed #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  color: #94a3b8;
}
.register-avatar-upload:hover {
  border-color: var(--brand-teal);
  color: var(--brand-teal);
}
.register-avatar-upload .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.empty-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.empty-avatar i {
  font-size: 1.8rem;
}
.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.avatar-overlay i {
  font-size: 1.1rem;
}
.register-avatar-upload:hover .avatar-overlay {
  opacity: 1;
}

.verification-input::placeholder {
  font-weight: 400;
  opacity: 0.5;
}
</style>
