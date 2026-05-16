<script setup>
/**
 * 前台會員註冊頁
 * 使用 Vue 前台設計系統：Bootstrap + 品牌色彩
 * 欄位：帳號、密碼、姓名、性別、生日、電話、Email
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { memberApi } from '@/api/member'

const router = useRouter()

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

// 提交註冊
async function handleRegister() {
  const d = form.value
  if (!d.username || !d.password || !d.fullName || !d.birthday || !d.phone || !d.email) {
    errorMsg.value = '請填寫所有欄位'
    return
  }
  
  if (!/^[A-Za-z0-9]{6,12}$/.test(d.username)) {
    errorMsg.value = '帳號必須為 6-12 碼英數字 (不可包含特殊字元)'
    return
  }
  if (d.password.length < 6 || d.password.length > 12) {
    errorMsg.value = '密碼必須為 6-12 碼英數字'
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

  isLoading.value = true
  errorMsg.value = ''

  try {
    await memberApi.register(d)
    // 註冊成功，跳到登入頁
    router.push({ path: '/login', query: { registered: '1' } })
  } catch (err) {
    // 直接顯示後端回傳的真實錯誤訊息
    const msg = err.response?.data
    if (typeof msg === 'string') {
      errorMsg.value = msg
    } else {
      errorMsg.value = '註冊失敗，請檢查輸入內容'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="container py-3">
      <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">

          <div class="register-card card-rounded shadow-sm p-3">
            <!-- Header -->
            <div class="text-center mb-2">
              <div class="brand-icon-circle mx-auto mb-2">
                <i class="bi bi-person-plus"></i>
              </div>
              <h2 class="fw-bold text-gradient mb-1">會員註冊</h2>
              <p class="text-muted small tracking-wider mb-0">CREATE YOUR ACCOUNT</p>
            </div>

            <!-- Error -->
            <div v-if="errorMsg" class="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span class="small">{{ errorMsg }}</span>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleRegister">
              <div class="mb-2">
                <label class="form-label fw-semibold small text-secondary">
                  設定帳號
                </label>
                <input v-model="form.username" type="text" class="form-control rounded-3"
                       placeholder="請輸入 6-12 碼英數字" maxlength="12" autocomplete="off" autofocus />
              </div>

              <div class="mb-2">
                <label class="form-label fw-semibold small text-secondary">
                  設定密碼
                </label>
                <div class="position-relative">
                  <input v-model="form.password" :type="showPassword ? 'text' : 'password'"
                         class="form-control rounded-3" placeholder="請輸入 6-12 碼英數字" maxlength="12"
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

              <button type="submit" class="btn btn-brand w-100 py-2 fw-bold" :disabled="isLoading">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                <span v-if="isLoading">註冊中...</span>
                <span v-else><i class="bi bi-check-circle me-2"></i>立即註冊</span>
              </button>
            </form>

            <!-- Footer -->
            <div class="text-center mt-3 pt-2 border-top">
              <span class="text-muted small">已經有帳號了？</span>
              <RouterLink to="/login" class="login-link fw-bold small text-decoration-none ms-1">
                返回登入
              </RouterLink>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  display: flex;
  align-items: center;
}

.register-card {
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
</style>
