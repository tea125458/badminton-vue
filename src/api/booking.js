/**
 * 預約 API 模組
 * 對應後端：BookingRestController → /api/bookings/**
 */
import api from './index'

export const bookingApi = {
  findAll: () => api.get('/bookings'),
  findById: (id) => api.get(`/bookings/${id}`),
  create: (booking) => api.post('/bookings', booking),
  updateStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
  search: (keyword) => api.get('/bookings/search', { params: { keyword } }),
}
