<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'

const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const isAdmin = ref(false) // 是否為主管 (MANAGER)

const form = ref({
  username: '',
  fullName: '',
  gender: '',
  birthday: '',
  phone: '',
  email: '',
  password: '' // 用於變更密碼
})

const todayDate = new Date().toISOString().split('T')[0]

async function loadProfile() {
  isLoading.value = true
  try {
    const res = await adminApi.getProfile()
    const d = res.data || res
    form.value = {
      username: d.username || '',
      fullName: d.fullName || '',
      gender: d.gender || '男',
      birthday: d.birthday || '',
      phone: d.phone || '',
      email: d.email || '',
      password: '' // 預設留空
    }
  } catch (e) {
    errorMsg.value = '無法載入個人資料：' + (e.response?.data || e.message)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  // 從 localStorage 取得目前的管理員角色
  try {
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'))
    isAdmin.value = adminInfo?.role === 'MANAGER'
  } catch (e) {}

  loadProfile()
})

function formatPhone() {
  let v = form.value.phone.replace(/\D/g, '')
  if (v.length > 10) v = v.substring(0, 10)
  let f = ''
  if (v.length > 0) f = v.substring(0, 4)
  if (v.length > 4) f += '-' + v.substring(4, 7)
  if (v.length > 7) f += '-' + v.substring(7, 10)
  form.value.phone = f
}

async function handleSave() {
  const d = { ...form.value }
  
  if (!d.fullName || !d.gender || !d.birthday || !d.phone || !d.email) {
    errorMsg.value = '請填寫所有必填欄位'
    successMsg.value = ''
    return
  }
  if (d.birthday > todayDate) {
    errorMsg.value = '生日不可為未來的日期'
    successMsg.value = ''
    return
  }
  const phoneDigits = d.phone.replace(/\D/g, '')
  if (phoneDigits.length !== 10 || !phoneDigits.startsWith('09')) {
    errorMsg.value = '電話格式錯誤！必須為 09 開頭的 10 位數字'
    successMsg.value = ''
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errorMsg.value = 'Email 格式錯誤'
    successMsg.value = ''
    return
  }

  // 如果密碼留空，代表不修改
  if (!d.password) {
    delete d.password
  }

  isLoading.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const res = await adminApi.updateProfile(d)
    successMsg.value = '個人資料更新成功！'
    // 更新 localStorage 裡的 adminInfo 名字
    const info = JSON.parse(localStorage.getItem('adminInfo') || '{}')
    info.fullName = d.fullName
    localStorage.setItem('adminInfo', JSON.stringify(info))
    form.value.password = '' // 清空密碼欄位
  } catch (e) {
    errorMsg.value = '更新失敗：' + (e.response?.data || e.message)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="admin-profile pt-0 pb-4">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-8 col-xl-7">
          
          <!-- 外部大標題 -->
          <div class="d-flex align-items-center mb-3 gap-3">
            <div class="icon-circle-gradient">
              <i class="bi bi-person-fill"></i>
            </div>
            <h4 class="fw-bold mb-0 text-dark">個人中心</h4>
          </div>

          <div class="profile-card shadow-sm border p-4 p-md-5 bg-white">
            <div v-if="isLoading && !form.username" class="loading-state">
              <div class="spinner"></div>
              <span>載入中...</span>
            </div>

            <div v-else>
              <!-- 狀態訊息 -->
              <div v-if="errorMsg" class="alert alert-danger d-flex align-items-center gap-2 mb-3 border-0 small">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span>{{ errorMsg }}</span>
              </div>
              <div v-if="successMsg" class="alert alert-success d-flex align-items-center gap-2 mb-3 border-0 small">
                <i class="bi bi-check-circle-fill"></i>
                <span>{{ successMsg }}</span>
              </div>

              <form @submit.prevent="handleSave">
                <!-- 1. 帳號資訊 -->
                <div class="section-group mb-4">
                  <h5 class="section-title-bar mb-4">帳號資訊</h5>
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label-gray">登入帳號 <span class="desc">(不可改)</span></label>
                      <input type="text" class="form-control-styled" :value="form.username" disabled />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label-gray">變更密碼 <span class="desc">(不改請留空)</span></label>
                      <input v-model="form.password" type="password" class="form-control-styled" placeholder="請輸入新密碼" />
                    </div>
                  </div>
                </div>

                <!-- 2. 個人資料 -->
                <div class="section-group mb-4">
                  <h5 class="section-title-bar mb-4">個人資料</h5>
                  <div class="row g-4 mb-4">
                    <div class="col-md-6">
                      <label class="form-label-gray">姓名</label>
                      <input v-model="form.fullName" type="text" class="form-control-styled" placeholder="請輸入姓名" :disabled="!isAdmin" required />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label-gray">性別</label>
                      <div class="d-flex gap-4 pt-2">
                        <label class="radio-label">
                          <input v-model="form.gender" type="radio" value="男" :disabled="!isAdmin" /> 男
                        </label>
                        <label class="radio-label">
                          <input v-model="form.gender" type="radio" value="女" :disabled="!isAdmin" /> 女
                        </label>
                      </div>
                    </div>
                  </div>

                  <div class="row g-4 mb-4">
                    <div class="col-md-6">
                      <label class="form-label-gray">生日</label>
                      <input v-model="form.birthday" type="date" class="form-control-styled" :max="todayDate" :disabled="!isAdmin" required @click="$event.target.showPicker()" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label-gray">手機號碼</label>
                      <input v-model="form.phone" type="text" class="form-control-styled" placeholder="09xx-xxx-xxx" maxlength="12" @input="formatPhone" required />
                    </div>
                  </div>

                  <div class="row g-4">
                    <div class="col-12">
                      <label class="form-label-gray">電子信箱</label>
                      <input v-model="form.email" type="email" class="form-control-styled" placeholder="example@mail.com" required />
                    </div>
                  </div>
                </div>

                <div class="d-flex justify-content-end gap-3 mt-4 pt-4 border-top">
                  <button type="submit" class="btn-save-styled" :disabled="isLoading">
                    <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                    <i v-else class="bi bi-download me-2"></i>
                    儲存變更
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-profile {
  background-color: #f4f7f9;
  min-height: calc(100vh - 120px);
}

.profile-card {
  background: white;
  border-radius: 1rem;
}

/* 標題圖示藍綠色漸層圓圈 */
.icon-circle-gradient {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #12b7d9, #1c7ed6);
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
  color: #18a0da;
}
.section-title-bar::before {
  content: "";
  display: inline-block;
  width: 3px;
  height: 1.1rem;
  background-color: #0e87bf;
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
  background: linear-gradient(135deg, #12b7d9, #1c7ed6);
  color: white;
  border: none;
  padding: 10px 28px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.btn-save-styled:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.loading-state { text-align: center; padding: 3rem; color: #94A3B8; }
.spinner {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid #E2E8F0; border-top-color: #12b7d9;
  border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 0.5rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
