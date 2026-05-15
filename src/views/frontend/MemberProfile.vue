<script setup>
/**
 * 前台會員個人中心
 * 使用 Vue 前台設計系統：Bootstrap + 品牌色彩
 * - 上方：歡迎區 + 帳號 / 等級概覽
 * - 下方：個人資料表單（姓名、性別不可改）
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { memberApi } from '@/api/member'

const router = useRouter()

const member = ref(null)
const isLoading = ref(true)
const isSaving = ref(false)
const successMsg = ref('')
const avatarUrl = ref(null)
const isUploadingAvatar = ref(false)
const errorMsg = ref('')

const form = ref({
  fullName: '',
  gender: '',
  birthday: '',
  phone: '',
  email: '',
})

// 修改密碼相關
const pwdForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const showOldPwd = ref(false)
const showNewPwd = ref(false)
const pwdSuccessMsg = ref('')
const pwdErrorMsg = ref('')
const isChangingPwd = ref(false)

// 頁籤切換
const activeTab = ref('profile') // 'profile', 'bookings', 'orders'
const menuItems = [
  { id: 'profile', label: '會員帳號資料', icon: 'bi-person-gear' },
  { id: 'bookings', label: '我的預約紀錄', icon: 'bi-calendar-check' },
  { id: 'orders', label: '歷史消費訂單', icon: 'bi-bag-check' },
]

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

// 載入個人資料
onMounted(async () => {
  const token = localStorage.getItem('memberToken')
  if (!token) {
    router.replace('/login')
    return
  }

  try {
    const data = await memberApi.getProfile()
    member.value = data
    avatarUrl.value = data.profilePicture || null
    form.value = {
      fullName: data.fullName || '',
      gender: data.gender || '',
      birthday: data.birthday || '',
      phone: data.phone || '',
      email: data.email || '',
    }
  } catch (err) {
    if (err.response?.status === 401) {
      localStorage.removeItem('memberToken')
      localStorage.removeItem('memberInfo')
      router.replace('/login')
    }
  } finally {
    isLoading.value = false
  }
})

// 儲存變更
async function handleSave() {
  successMsg.value = ''
  errorMsg.value = ''

  const d = form.value
  if (!d.phone || !d.email) {
    errorMsg.value = '電話和 Email 為必填'
    return
  }
  const phoneDigits = d.phone.replace(/\D/g, '')
  if (phoneDigits.length !== 10 || !phoneDigits.startsWith('09')) {
    errorMsg.value = '電話格式錯誤！必須為 09 開頭的 10 位數字'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errorMsg.value = 'Email 格式錯誤！'
    return
  }

  isSaving.value = true
  try {
    await memberApi.updateProfile(d)
    successMsg.value = '個人資料已更新成功！'
    // 同步 localStorage
    const info = JSON.parse(localStorage.getItem('memberInfo') || '{}')
    Object.assign(info, d)
    localStorage.setItem('memberInfo', JSON.stringify(info))
  } catch (err) {
    errorMsg.value = '更新失敗，請檢查輸入內容'
  } finally {
    isSaving.value = false
  }
}

// 執行修改密碼
async function handleChangePassword() {
  pwdSuccessMsg.value = ''
  pwdErrorMsg.value = ''

  const { oldPassword, newPassword, confirmPassword } = pwdForm.value
  if (!oldPassword || !newPassword || !confirmPassword) {
    pwdErrorMsg.value = '請填寫所有密碼欄位'
    return
  }
  if (newPassword !== confirmPassword) {
    pwdErrorMsg.value = '兩次輸入的新密碼不一致'
    return
  }
  if (newPassword.length < 6 || newPassword.length > 12) {
    pwdErrorMsg.value = '新密碼長度必須為 6-12 碼'
    return
  }

  isChangingPwd.value = true
  try {
    await memberApi.changePassword(oldPassword, newPassword)
    pwdSuccessMsg.value = '密碼已修改成功！'
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    pwdErrorMsg.value = err.response?.data || '修改失敗，請檢查舊密碼是否正確'
  } finally {
    isChangingPwd.value = false
  }
}

// 登出
function handleLogout() {
  localStorage.removeItem('memberToken')
  localStorage.removeItem('memberInfo')
  router.push('/login')
}

function getLevelBadge(level) {
  return level === 'VIP'
    ? { label: 'VIP 會員', cls: 'badge-vip' }
    : { label: '一般會員', cls: 'badge-normal' }
}

// 點擊頭像觸發檔案選擇
function triggerAvatarUpload() {
  document.getElementById('avatarFileInput').click()
}

// 上傳頭像
async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // 檢查檔案類型
  if (!file.type.startsWith('image/')) {
    alert('請選擇圖片檔案（JPG、PNG 等）')
    return
  }
  // 檢查檔案大小（最大 2MB）
  if (file.size > 2 * 1024 * 1024) {
    alert('圖片大小不能超過 2MB')
    return
  }

  isUploadingAvatar.value = true
  try {
    const res = await memberApi.uploadAvatar(file)
    avatarUrl.value = res.imageUrl
    // 同步更新 localStorage 中的會員資料
    const info = JSON.parse(localStorage.getItem('memberInfo') || '{}')
    info.profilePicture = res.imageUrl
    localStorage.setItem('memberInfo', JSON.stringify(info))
    successMsg.value = '頭像更新成功！'
    setTimeout(() => successMsg.value = '', 3000)
  } catch (err) {
    alert('頭像上傳失敗，請重試')
  } finally {
    isUploadingAvatar.value = false
    event.target.value = '' // 清空 input 讓同一張圖也能重選
  }
}
</script>

<template>
  <div class="profile-page py-3">
    <div class="container-fluid px-lg-4">
      <div class="row justify-content-center">
        <div class="col-lg-12 col-xl-11">
          
          <div class="row g-4">
            <!-- 左側選單 -->
            <div class="col-lg-4 col-xl-3">
              <div class="member-sidebar shadow-sm border bg-white p-3">
                <div class="sidebar-user-info text-center py-3 mb-3 border-bottom">
                  <!-- 可點擊上傳的頭像 -->
                  <div class="sidebar-avatar mx-auto mb-2" @click="triggerAvatarUpload" title="點擊更換頭像">
                    <img v-if="avatarUrl" :src="'http://localhost:8080' + avatarUrl" alt="頭像" class="avatar-img" />
                    <i v-else class="bi bi-person-fill"></i>
                    <div class="avatar-overlay">
                      <i class="bi bi-camera-fill"></i>
                      <span>編輯</span>
                    </div>
                    <div v-if="isUploadingAvatar" class="avatar-loading">
                      <div class="spinner-border spinner-border-sm text-white" role="status"></div>
                    </div>
                  </div>
                  <input type="file" id="avatarFileInput" accept="image/*" style="display: none;" @change="handleAvatarUpload" />
                  <h6 class="fw-bold mb-1 text-dark">{{ member?.fullName || member?.username }}</h6>
                  <span class="badge" :class="getLevelBadge(member?.membershipLevel).cls">
                    {{ getLevelBadge(member?.membershipLevel).label }}
                  </span>
                </div>
                <div class="list-group list-group-flush border-0">
                  <button v-for="item in menuItems" :key="item.id"
                          class="list-group-item list-group-item-action sidebar-item mb-2"
                          :class="{ 'active': activeTab === item.id }"
                          @click="activeTab = item.id">
                    <i class="bi me-3" :class="item.icon"></i>
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 右側內容 -->
            <div class="col-lg-8 col-xl-9">
              <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-info" role="status"></div>
                <p class="text-muted mt-2 small">資料載入中...</p>
              </div>

              <template v-else-if="member">
                <!-- 頁籤 1: 個人資料 -->
                <div v-if="activeTab === 'profile'" class="tab-content-fade">
                  <!-- 1. 個人資料卡片 -->
                  <div class="profile-card-base shadow-sm border p-4 bg-white">
                    <h6 class="section-title-bar mb-4">基本資料</h6>
                    <div class="row g-3 mb-4">
                      <div class="col-md-6">
                        <label class="form-label-gray">姓名</label>
                        <input v-model="form.fullName" type="text" class="form-control-styled" disabled />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label-gray">帳號</label>
                        <input :value="member.username" type="text" class="form-control-styled" disabled />
                      </div>
                    </div>

                    <!-- 第二排：生日與性別 (皆設為反灰) -->
                    <div class="row g-3 mb-4">
                      <div class="col-md-6">
                        <label class="form-label-gray">生日</label>
                        <input v-model="form.birthday" type="date" class="form-control-styled" disabled />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label-gray">性別</label>
                        <div class="d-flex gap-4 pt-2">
                          <label class="radio-label">
                            <input v-model="form.gender" type="radio" value="男" disabled /> 男
                          </label>
                          <label class="radio-label">
                            <input v-model="form.gender" type="radio" value="女" disabled /> 女
                          </label>
                        </div>
                      </div>
                    </div>

                    <!-- 第三排：手機與信箱 (可修改) -->
                    <div class="row g-3 mb-4">
                      <div class="col-md-6">
                        <label class="form-label-gray">手機號碼</label>
                        <input v-model="form.phone" type="text" class="form-control-styled"
                                placeholder="09xx-xxx-xxx" maxlength="12" @input="formatPhone" />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label-gray">電子信箱</label>
                        <input v-model="form.email" type="email" class="form-control-styled" />
                      </div>
                    </div>

                    <div v-if="successMsg" class="alert alert-success border-0 py-2 mb-3 small text-center">
                      <i class="bi bi-check-circle-fill me-1"></i> {{ successMsg }}
                    </div>
                    <div v-if="errorMsg" class="alert alert-danger border-0 py-2 mb-3 small text-center">
                      <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ errorMsg }}
                    </div>

                    <div class="d-flex justify-content-end mt-4 pt-3 border-top">
                      <button type="submit" class="btn-save-styled" @click="handleSave" :disabled="isSaving">
                        <span v-if="isSaving" class="spinner-border spinner-border-sm me-2"></span>
                        儲存變更
                      </button>
                    </div>
                  </div>

                  <!-- 2. 安全設定卡片 -->
                  <div class="profile-card-base shadow-sm border p-4 bg-white mt-4">
                    <h6 class="section-title-bar mb-4">修改密碼</h6>
                    <div class="row g-3 mb-3">
                      <div class="col-md-12">
                        <label class="form-label-gray">目前密碼</label>
                        <div class="position-relative">
                          <input v-model="pwdForm.oldPassword" :type="showOldPwd ? 'text' : 'password'" 
                                 class="form-control-styled" placeholder="請輸入原有的密碼" />
                          <button type="button" class="btn-pwd-toggle" @click="showOldPwd = !showOldPwd">
                            <i :class="showOldPwd ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="row g-3 mb-3">
                      <div class="col-md-6">
                        <label class="form-label-gray">新密碼</label>
                        <div class="position-relative">
                          <input v-model="pwdForm.newPassword" :type="showNewPwd ? 'text' : 'password'" 
                                 class="form-control-styled" placeholder="6-12 碼英數字" />
                          <button type="button" class="btn-pwd-toggle" @click="showNewPwd = !showNewPwd">
                            <i :class="showNewPwd ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                          </button>
                        </div>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label-gray">確認新密碼</label>
                        <input v-model="pwdForm.confirmPassword" type="password" 
                               class="form-control-styled" placeholder="請再次輸入新密碼" />
                      </div>
                    </div>

                    <div v-if="pwdSuccessMsg" class="alert alert-success border-0 py-2 mb-3 small text-center">
                      <i class="bi bi-shield-check me-1"></i> {{ pwdSuccessMsg }}
                    </div>
                    <div v-if="pwdErrorMsg" class="alert alert-danger border-0 py-2 mb-3 small text-center">
                      <i class="bi bi-shield-exclamation me-1"></i> {{ pwdErrorMsg }}
                    </div>

                    <div class="d-flex justify-content-end mt-4 pt-3 border-top">
                      <button type="button" class="btn-pwd-save" @click="handleChangePassword" :disabled="isChangingPwd">
                        <span v-if="isChangingPwd" class="spinner-border spinner-border-sm me-2"></span>
                        確認變更
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 頁籤 2: 預約紀錄 (預留占位) -->
                <div v-if="activeTab === 'bookings'" class="tab-content-fade">
                  <div class="profile-card-base shadow-sm border p-5 bg-white text-center">
                    <div class="empty-state py-5">
                      <i class="bi bi-calendar-x mb-3 d-block text-light" style="font-size: 4rem;"></i>
                      <h5 class="fw-bold">尚無預約紀錄</h5>
                      <p class="text-muted">歡迎預約打羽球！</p>
                      <RouterLink to="/" class="btn-save-styled d-inline-block mt-3" style="text-decoration: none;">
                        前往預約
                      </RouterLink>
                    </div>
                  </div>
                </div>

                <!-- 頁籤 3: 訂單紀錄 (預留占位) -->
                <div v-if="activeTab === 'orders'" class="tab-content-fade">
                  <div class="profile-card-base shadow-sm border p-5 bg-white text-center">
                    <div class="empty-state py-5">
                      <i class="bi bi-cart-x mb-3 d-block text-light" style="font-size: 4rem;"></i>
                      <h5 class="fw-bold">尚無訂單紀錄</h5>
                      <p class="text-muted">尚無購買紀錄。</p>
                      <RouterLink to="/" class="btn-save-styled d-inline-block mt-3" style="text-decoration: none;">
                        前往商城
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  background-color: #f4f7f9;
  min-height: calc(100vh - 120px);
}

.profile-card-base {
  border-radius: 1rem;
}

/* 標題圖示藍綠色漸層圓圈 */
.icon-circle-gradient {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #12d9d6, #1c7ed6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.3rem;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(18, 183, 217, 0.2);
}

/* 區塊標題條 */
.section-title-bar {
  display: flex;
  align-items: center;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1bb0c1;
}
.section-title-bar::before {
  content: "";
  display: inline-block;
  width: 3px;
  height: 1.1rem;
  background-color: #11afbd;
  margin-right: 10px;
  border-radius: 2px;
}

/* 文字與標籤 */
.form-label-gray {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #495057;
  margin-bottom: 6px;
}
.form-label-gray .desc {
  font-size: 0.75rem;
  color: #adb5bd;
  font-weight: 400;
}

/* 輸入框 */
.form-control-styled {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e8;
  border-radius: 8px;
  background-color: #f8f9fb;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.form-control-styled:focus {
  outline: none;
  border-color: #1d8ad2;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(18, 183, 217, 0.1);
}
.form-control-styled:disabled {
  background-color: #f1f3f5;
  color: #868e96;
}

.radio-label {
  cursor: pointer;
  font-weight: 500;
  color: #495057;
  font-size: 0.9rem;
}

/* 按鈕 */
.btn-save-styled {
  background: linear-gradient(135deg, #14c9c6, #1c9ed6);
  color: white;
  border: none;
  padding: 10px 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.btn-save-styled:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-cancel-styled {
  background: white;
  color: #495057;
  border: 1px solid #dee2e6;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-cancel-styled:hover {
  background: #f8f9fa;
}

/* 修改密碼專用樣式 */
.btn-pwd-save {
  background-color: #94a3b8;
  color: white;
  border: none;
  padding: 10px 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(148, 163, 184, 0.2);
}
.btn-pwd-save:hover:not(:disabled) {
  background-color: #64748b;
  box-shadow: 0 6px 12px rgba(100, 116, 139, 0.3);
}
.btn-pwd-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #adb5bd;
  padding: 0 5px;
  z-index: 10;
}
.section-title-bar .desc {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 400;
}

/* 側邊欄樣式 */
.member-sidebar {
  border-radius: 1rem;
  height: 100%;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}
.sidebar-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #12d9d6, #1c7ed6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}
.sidebar-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
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
.sidebar-avatar:hover .avatar-overlay {
  opacity: 1;
}
.avatar-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sidebar-item {
  border: none;
  border-radius: 0.75rem !important;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.8rem 1.2rem;
  color: #495057;
  transition: all 0.2s;
}
.sidebar-item:hover {
  background-color: #f8f9fa;
  color: #1bb0c1;
}
.sidebar-item.active {
  background-color: #f0fdfa;
  color: #11afbd;
  border: none;
}
.sidebar-item.active::after {
  content: "";
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background-color: #11afbd;
  border-radius: 50%;
}

.badge-vip { background-color: #fef9c3; color: #ca8a04; font-weight: 700; }
.badge-normal { background-color: #f1f5f9; color: #64748b; font-weight: 700; }

.empty-state i {
  color: #e9ecef;
}

/* 轉場動畫 */
.tab-content-fade {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
