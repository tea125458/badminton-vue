/**
 * 會員 API 模組
 * 對應後端：MemberRestController → /api/members/**
 */
import api from './index'

// 取得 Authorization header
function authHeader() {
  const token = localStorage.getItem('memberToken') || localStorage.getItem('adminToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const memberApi = {
  // POST /api/members/login — 會員登入
  login: (username, password) => api.post('/members/login', { username, password }),

  // POST /api/members/register — 會員註冊
  register: (member, code) => {
    let url = '/members/register';
    if (code) {
      url += `?code=${code}`;
    }
    return api.post(url, member);
  },

  // GET /api/members/search?keyword=xxx — 搜尋會員
  search: (keyword) => api.get('/members/search', { params: { keyword } }),

  // GET /api/members/profile — 取得個人資料
  getProfile: () => api.get('/members/profile', { headers: authHeader() }),

  // PUT /api/members/profile — 更新個人資料
  updateProfile: (member) => api.put('/members/profile', member, { headers: authHeader() }),

  // PUT /api/members/change-password — 修改密碼
  changePassword: (oldPassword, newPassword) => api.put('/members/change-password', { oldPassword, newPassword }, { headers: authHeader() }),

  // POST /api/members/logout — 登出
  logout: () => api.post('/members/logout', null, { headers: authHeader() }),

  // POST /api/members/reset-password — 忘記密碼（重設密碼）
  resetPassword: (data) => api.post('/members/reset-password', data),

  // POST /api/members/send-verification-code — 發送驗證碼
  sendVerificationCode: (username, email) => api.post('/members/send-verification-code', { username, email }),

  // POST /api/members/send-register-code — 發送註冊驗證碼
  sendRegisterCode: (email, username) => api.post('/members/send-register-code', { email, username }),

  // POST /api/members/google-login — Google 第三方登入
  googleLogin: (credential) => api.post('/members/google-login', { credential }),

  // POST /api/members/upload-avatar — 上傳會員頭像
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/members/upload-avatar', formData, {
      headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
    })
  },
}
