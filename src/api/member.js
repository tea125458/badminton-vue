/**
 * 會員 API 模組
 * 對應後端：MemberRestController → /api/members/**
 */
import api from './index'

export const memberApi = {
  // POST /api/members/login — 會員登入
  login: (username, password) => api.post('/members/login', { username, password }),

  // POST /api/members/register — 會員註冊
  register: (member) => api.post('/members/register', member),

  // GET /api/members/search?keyword=xxx — 搜尋會員
  search: (keyword) => api.get('/members/search', { params: { keyword } }),

  // GET /api/members/profile — 取得個人資料
  getProfile: () => api.get('/members/profile'),

  // PUT /api/members/profile — 更新個人資料
  updateProfile: (member) => api.put('/members/profile', member),

  // POST /api/members/logout — 登出
  logout: () => api.post('/members/logout'),
}
