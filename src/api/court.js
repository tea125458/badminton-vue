/**
 * 場地 API 模組
 * 對應後端：CourtRestController → /api/courts/**
 */
import api from './index'

export const courtApi = {
  findAll: () => api.get('/courts'),
  findById: (id) => api.get(`/courts/${id}`),
  create: (court) => api.post('/courts', court),
  update: (id, court) => api.put(`/courts/${id}`, court),
  updateStatus: (id, status) => api.patch(`/courts/${id}/status`, { status }),
  delete: (id) => api.delete(`/courts/${id}`),
}
