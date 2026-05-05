/**
 * 管理員 API 模組
 * 對應後端：AdminRestController → /api/admins/**
 */
import api from './index'

export const adminApi = {
  // ===== 管理員帳號 =====
  login: (username, password) => api.post('/admins/login', { username, password }),
  logout: () => api.post('/admins/logout'),
  getAll: () => api.get('/admins/list'),
  getById: (id) => api.get(`/admins/${id}`),
  add: (admin) => api.post('/admins/add', admin),
  update: (id, admin) => api.put(`/admins/${id}`, admin),
  delete: (id) => api.delete(`/admins/${id}`),
  search: (keyword) => api.get('/admins/search', { params: { keyword } }),
  updateNote: (id, note) => api.patch(`/admins/${id}/note`, { note }),
  updateStatus: (id, status) => api.patch(`/admins/${id}/status`, { status }),

  // ===== 管理員管理會員 =====
  getAllMembers: () => api.get('/admins/member'),
  searchMembers: (keyword) => api.get('/admins/member/search', { params: { keyword } }),
  getMemberById: (id) => api.get(`/admins/member/${id}`),
  updateMember: (id, member) => api.put(`/admins/member/${id}`, member),
  deleteMember: (id) => api.delete(`/admins/member/${id}`),
  updateMemberNote: (id, note) => api.patch(`/admins/member/${id}/note`, { note }),
  updateMemberStatus: (id, status) => api.patch(`/admins/member/${id}/status`, { status }),
}
