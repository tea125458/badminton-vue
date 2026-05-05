/**
 * 公告 API 模組
 * 對應後端：AnnouncementRestController → /api/announcements/**
 */
import api from './index'

export const announcementApi = {
  findAll: () => api.get('/announcements'),
  findById: (id) => api.get(`/announcements/${id}`),
  create: (announcement) => api.post('/announcements', announcement),
  update: (id, announcement) => api.put(`/announcements/${id}`, announcement),
  updateStatus: (id, status) => api.patch(`/announcements/${id}/status`, { status }),
  delete: (id) => api.delete(`/announcements/${id}`),
}
