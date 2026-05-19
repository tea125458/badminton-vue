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

  // PATCH /api/announcements/:id/view → 瀏覽次數 +1
  incrementView: (id) => api.patch(`/announcements/${id}/view`),

  // POST /api/announcements/upload — 上傳公告圖片（可帶 oldImageUrl 自動刪除舊圖）
  uploadImage: (file, oldImageUrl) => {
    const formData = new FormData()
    formData.append('image', file)
    if (oldImageUrl) {
      formData.append('oldImageUrl', oldImageUrl)
    }
    return api.post('/announcements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
