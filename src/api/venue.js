/**
 * 場館 API 模組
 * 對應後端：VenueRestController → /api/venues/**
 */
import api from './index'

export const venueApi = {
  findAll: () => api.get('/venues'),
  findById: (id) => api.get(`/venues/${id}`),
  create: (venue) => api.post('/venues', venue),
  update: (id, venue) => api.put(`/venues/${id}`, venue),
  updateStatus: (id, status) => api.patch(`/venues/${id}/status`, { status }),
  delete: (id) => api.delete(`/venues/${id}`),

  // POST /api/venues/upload — 上傳場館圖片（可帶 oldImageUrl 自動刪除舊圖）
  uploadImage: (file, oldImageUrl) => {
    const formData = new FormData()
    formData.append('image', file)
    if (oldImageUrl) {
      formData.append('oldImageUrl', oldImageUrl)
    }
    return api.post('/venues/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
