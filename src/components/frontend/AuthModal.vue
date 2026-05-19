<script setup>
/**
 * AuthModal — 登入/註冊雙模式彈窗
 * 用於預約流程等需要認證的場景，不離開當前頁面即可完成登入或註冊
 *
 * Props:
 *   modelValue (Boolean) — 控制 Modal 顯示/隱藏 (v-model)
 * Events:
 *   update:modelValue — 同步 v-model
 *   login-success — 登入或註冊成功後觸發
 */
import { ref, watch } from 'vue'
import { memberApi } from '@/api/member'
import { useMemberStore } from '@/stores/member'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'login-success'])

const memberStore = useMemberStore()

// ============================
// 共用狀態
// ============================
const activeTab = ref('login') // 'login' | 'register'
const isLoading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

// 切換 Tab 時清空錯誤訊息
function switchTab(tab) {
  activeTab.value = tab
  errorMsg.value = ''
  showPassword.value = false
}

// 關閉 Modal
function closeModal() {
  emit('update:modelValue', false)
  // 關閉後重置狀態
  setTimeout(() => {
    errorMsg.value = ''
    showPassword.value = false
  }, 300) // 等動畫結束再清
}

// 監聽 modelValue 變化，打開時重置
watch(() => props.modelValue, (val) => {
  if (val) {
    activeTab.value = 'login'
    errorMsg.value = ''
    showPassword.value = false
    loginForm.value = { username: '', password: '' }
    registerForm.value = {
      username: '', password: '', confirmPassword: '',
      fullName: '', gender: '男', birthday: '2000-01-01',
      phone: '', email: '',
    }
    registerAvatarFile.value = null
    registerAvatarPreview.value = null
  }
})

// ============================
// 登入邏輯
// ============================
const loginForm = ref({
  username: '',
  password: '',
})

// 快速填入測試帳號
function quickFill() {
  loginForm.value.username = 'chen.weijie'
  loginForm.value.password = 'pass123'
}

async function handleLogin() {
  const { username, password } = loginForm.value
  if (!username.trim() || !password.trim()) {
    errorMsg.value = '請輸入帳號和密碼'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const res = await memberApi.login(username.trim(), password)
    memberStore.login(res.token, res.member)
    closeModal()
    emit('login-success')
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

// ============================
// 註冊邏輯
// ============================
const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  gender: '男',
  birthday: '2000-01-01',
  phone: '',
  email: '',
})

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

const todayDate = new Date().toISOString().split('T')[0]

// 電話格式化
function formatPhone() {
  let v = registerForm.value.phone.replace(/\D/g, '')
  if (v.length > 10) v = v.substring(0, 10)
  let f = ''
  if (v.length > 0) f = v.substring(0, 4)
  if (v.length > 4) f += '-' + v.substring(4, 7)
  if (v.length > 7) f += '-' + v.substring(7, 10)
  registerForm.value.phone = f
}

async function handleRegister() {
  const d = registerForm.value
  if (!d.username || !d.password || !d.fullName || !d.birthday || !d.phone || !d.email) {
    errorMsg.value = '請填寫所有欄位'
    return
  }
  if (!/^[A-Za-z0-9]{6,15}$/.test(d.username)) {
    errorMsg.value = '帳號必須為 6-15 碼英數字 (不可包含特殊字元)'
    return
  }
  if (d.password.length < 6 || d.password.length > 15) {
    errorMsg.value = '密碼必須為 6-15 碼英數字'
    return
  }
  if (d.password !== d.confirmPassword) {
    errorMsg.value = '兩次輸入的密碼不一致'
    return
  }
  const phoneDigits = d.phone.replace(/\D/g, '')
  if (phoneDigits.length !== 10 || !phoneDigits.startsWith('09')) {
    errorMsg.value = '電話格式錯誤，需為 09 開頭的 10 位數字'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errorMsg.value = 'Email 格式錯誤'
    return
  }
  if (d.birthday > todayDate) {
    errorMsg.value = '生日不可為未來的日期'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const res = await memberApi.register(d)
    // 後端已改為回傳 { token, member }，註冊即登入
    memberStore.login(res.token, res.member)

    // 如果有選擇大頭貼，註冊成功後接著上傳
    if (registerAvatarFile.value) {
      try {
        const uploadRes = await memberApi.uploadAvatar(registerAvatarFile.value)
        const info = JSON.parse(localStorage.getItem('memberInfo') || '{}')
        info.profilePicture = uploadRes.imageUrl
        localStorage.setItem('memberInfo', JSON.stringify(info))
        // 重新呼叫 login 來更新 store 中的 avatar
        memberStore.login(res.token, info)
      } catch (uploadErr) {
        console.error('註冊時上傳大頭貼失敗', uploadErr)
      }
    }

    closeModal()
    emit('login-success')
  } catch (err) {
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
  <!-- Modal Backdrop + Container -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="auth-modal-backdrop" @click.self="closeModal">
        <div class="auth-modal-container">

          <!-- 關閉按鈕 -->
          <button class="auth-modal-close" @click="closeModal" aria-label="關閉">
            <i class="bi bi-x-lg"></i>
          </button>

          <!-- Header：Tab 切換 -->
          <div class="text-center mt-1 mb-4">
            <div class="auth-tab-group">
              <button
                class="auth-tab"
                :class="{ active: activeTab === 'login' }"
                @click="switchTab('login')"
              >
                <i class="bi bi-box-arrow-in-right me-1"></i>登入
              </button>
              <button
                class="auth-tab"
                :class="{ active: activeTab === 'register' }"
                @click="switchTab('register')"
              >
                <i class="bi bi-person-plus me-1"></i>註冊
              </button>
            </div>
          </div>

          <!-- 錯誤訊息 -->
          <div v-if="errorMsg" class="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 auth-error">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span class="small">{{ errorMsg }}</span>
          </div>

          <!-- ======================== -->
          <!-- 登入表單 -->
          <!-- ======================== -->
          <form v-if="activeTab === 'login'" @submit.prevent="handleLogin">
            <div class="mb-2">
              <label class="form-label fw-semibold small text-secondary">帳號</label>
              <input
                v-model="loginForm.username"
                type="text"
                class="form-control rounded-3"
                placeholder="請輸入您的帳號"
                autocomplete="off"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small text-secondary">密碼</label>
              <div class="position-relative">
                <input
                  v-model="loginForm.password"
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
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
              <span v-if="isLoading">登入中...</span>
              <span v-else>登入</span>
            </button>

            <button
              type="button"
              class="btn btn-outline-secondary w-100 mt-2 py-1 fw-semibold border-dashed"
              @click="quickFill"
            >
              <i class="bi bi-lightning-fill text-warning me-1"></i>測試帳號
            </button>

          </form>

          <!-- ======================== -->
          <!-- 註冊表單 -->
          <!-- ======================== -->
          <form v-else @submit.prevent="handleRegister">
            
            <!-- 大頭貼上傳 -->
            <div class="d-flex flex-column align-items-center mb-3">
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
              <span class="fw-semibold small text-secondary mt-2">請上傳大頭貼</span>
            </div>

            <div class="row mb-2">
              <div class="col-7">
                <label class="form-label fw-semibold small text-secondary">姓名</label>
                <input
                  v-model="registerForm.fullName"
                  type="text"
                  class="form-control rounded-3"
                  placeholder="請輸入姓名"
                />
              </div>
              <div class="col-5">
                <label class="form-label fw-semibold small text-secondary">性別</label>
                <div class="d-flex gap-3 pt-1">
                  <label class="form-check-label d-flex align-items-center gap-1">
                    <input v-model="registerForm.gender" type="radio" value="男" class="form-check-input" /> 男
                  </label>
                  <label class="form-check-label d-flex align-items-center gap-1">
                    <input v-model="registerForm.gender" type="radio" value="女" class="form-check-input" /> 女
                  </label>
                </div>
              </div>
            </div>

            <div class="mb-2">
              <label class="form-label fw-semibold small text-secondary">設定帳號</label>
              <input
                v-model="registerForm.username"
                type="text"
                class="form-control rounded-3"
                placeholder="請輸入 6-15 碼"
                maxlength="15"
                autocomplete="off"
              />
            </div>

            <div class="mb-2">
              <label class="form-label fw-semibold small text-secondary">設定密碼</label>
              <div class="position-relative">
                <input
                  v-model="registerForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-control rounded-3"
                  placeholder="請輸入 6-15 碼"
                  maxlength="15"
                  autocomplete="new-password"
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

            <div class="mb-2">
              <label class="form-label fw-semibold small text-secondary">確認密碼</label>
              <input
                v-model="registerForm.confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                class="form-control rounded-3"
                placeholder="請再次輸入密碼"
                maxlength="12"
                autocomplete="new-password"
              />
              <!-- 即時密碼驗證提示 -->
              <div v-if="registerForm.confirmPassword" class="mt-1 px-1">
                <span v-if="registerForm.password === registerForm.confirmPassword" class="text-success small fw-bold">
                  <i class="bi bi-check-circle-fill me-1"></i>密碼一致
                </span>
                <span v-else class="text-danger small fw-bold">
                  <i class="bi bi-x-circle-fill me-1"></i>密碼不一致
                </span>
              </div>
            </div>


            <div class="row mb-2">
              <div class="col-6">
                <label class="form-label fw-semibold small text-secondary">生日</label>
                <input
                  v-model="registerForm.birthday"
                  type="date"
                  class="form-control rounded-3 px-2"
                  :max="todayDate"
                  @click="$event.target.showPicker()"
                />
              </div>
              <div class="col-6">
                <label class="form-label fw-semibold small text-secondary">電話</label>
                <input
                  v-model="registerForm.phone"
                  type="text"
                  class="form-control rounded-3"
                  placeholder="0912-345-678"
                  maxlength="12"
                  @input="formatPhone"
                />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small text-secondary">電子信箱</label>
              <input
                v-model="registerForm.email"
                type="email"
                class="form-control rounded-3"
                placeholder="example@mail.com"
              />
            </div>

            <button type="submit" class="btn btn-brand w-100 py-2 fw-bold" :disabled="isLoading">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
              <span v-if="isLoading">註冊中...</span>
              <span v-else><i class="bi bi-check-circle me-2"></i>立即註冊</span>
            </button>

          </form>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ============================
   Backdrop 全螢幕遮罩
   ============================ */
.auth-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  padding: 1rem;
}

/* ============================
   Modal 容器
   ============================ */
.auth-modal-container {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 1.25rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
  padding: 2rem 1.75rem;
  animation: modalSlideUp 0.35s ease;
}

@keyframes modalSlideUp {
  from { opacity: 0; transform: translateY(30px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ============================
   關閉按鈕
   ============================ */
.auth-modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: #F1F5F9;
  border: none;
  border-radius: 0.5rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748B;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.auth-modal-close:hover {
  background: #E2E8F0;
  color: #1E293B;
}

/* ============================
   品牌 Icon
   ============================ */
.brand-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.4rem;
  transition: transform 0.3s ease;
}

/* ============================
   Tab 切換按鈕群組
   ============================ */
.auth-tab-group {
  display: inline-flex;
  background: #F1F5F9;
  border-radius: 0.75rem;
  padding: 4px;
  gap: 4px;
}

.auth-tab {
  border: none;
  background: transparent;
  padding: 0.45rem 1.25rem;
  border-radius: 0.6rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748B;
  cursor: pointer;
  transition: all 0.25s ease;
}

.auth-tab.active {
  background: white;
  color: var(--brand-teal);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.auth-tab:hover:not(.active) {
  color: #334155;
}

/* ============================
   錯誤訊息
   ============================ */
.auth-error {
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

/* ============================
   表單元素
   ============================ */
.form-control:focus {
  border-color: var(--brand-teal);
  box-shadow: 0 0 0 0.2rem rgba(0, 180, 180, 0.15);
}

.form-control::placeholder {
  font-size: 0.9rem;
}

.form-check-input:checked {
  background-color: var(--brand-teal);
  border-color: var(--brand-teal);
}

.border-dashed {
  border-style: dashed !important;
  border-width: 2px !important;
}

/* ============================
   底部切換連結
   ============================ */
.auth-switch-link {
  color: #14b8a6;
  transition: opacity 0.2s;
}
.auth-switch-link:hover {
  opacity: 0.7;
  color: var(--brand-teal);
}

/* ============================
   Transition 動畫
   ============================ */
.modal-fade-enter-active {
  transition: opacity 0.3s ease;
}
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* ============================
   日期輸入修正
   ============================ */
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
   自訂捲軸（Modal 內容過長時）
   ============================ */
.auth-modal-container::-webkit-scrollbar {
  width: 6px;
}
.auth-modal-container::-webkit-scrollbar-track {
  background: transparent;
}
.auth-modal-container::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}

/* ============================
   註冊大頭貼上傳 (虛線背景 + 上傳後有遮罩)
   ============================ */
.register-avatar-upload {
  width: 80px;
  height: 80px;
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
</style>
