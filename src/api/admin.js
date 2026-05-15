/**
 * 管理員 API 模組
 * 對應後端：AdminRestController → /api/admins/**
 */
import api from './index'

// 取得 Authorization header
function authHeader() {
  const token = localStorage.getItem('adminToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const adminApi = {
  // ===== 管理員個人中心 =====
  getProfile: () => api.get('/admins/profile', { headers: authHeader() }),
  updateProfile: (admin) => api.put('/admins/profile', admin, { headers: authHeader() }),

  // ===== 管理員帳號 =====
  login: (username, password) => api.post('/admins/login', { username, password }),
  logout: () => api.post('/admins/logout', null, { headers: authHeader() }),
  getAll: () => api.get('/admins/list', { headers: authHeader() }),
  getById: (id) => api.get(`/admins/${id}`, { headers: authHeader() }),
  add: (admin) => api.post('/admins/add', admin, { headers: authHeader() }),
  update: (id, admin) => api.put(`/admins/${id}`, admin, { headers: authHeader() }),
  delete: (id) => api.delete(`/admins/${id}`, { headers: authHeader() }),
  search: (keyword) => api.get('/admins/search', { params: { keyword }, headers: authHeader() }),
  updateNote: (id, note) => api.patch(`/admins/${id}/note`, { note }, { headers: authHeader() }),
  updateStatus: (id, status) => api.patch(`/admins/${id}/status`, { status }, { headers: authHeader() }),

  // ===== 管理員管理會員 =====
  getAllMembers: () => api.get('/admins/member', { headers: authHeader() }),
  searchMembers: (keyword) => api.get('/admins/member/search', { params: { keyword }, headers: authHeader() }),
  addMember: (member) => api.post('/admins/member', member, { headers: authHeader() }),
  getMemberById: (id) => api.get(`/admins/member/${id}`, { headers: authHeader() }),
  updateMember: (id, member) => api.put(`/admins/member/${id}`, member, { headers: authHeader() }),
  deleteMember: (id) => api.delete(`/admins/member/${id}`, { headers: authHeader() }),
  updateMemberNote: (id, note) => api.patch(`/admins/member/${id}/note`, { note }, { headers: authHeader() }),
  updateMemberStatus: (id, status) => api.patch(`/admins/member/${id}/status`, { status }, { headers: authHeader() }),
}
