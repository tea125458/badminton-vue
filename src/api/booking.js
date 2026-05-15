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
  // GET /api/bookings/court/5/date/2026-05-15 — 查詢某球場某天的預約
  findByCourtAndDate: (courtId, date) => api.get(`/bookings/court/${courtId}/date/${date}`),
  // GET /api/bookings/my-all-bookings — 會員中心：取得自己的所有預約紀錄
  getMyAllBookings: () => api.get('/bookings/my-all-bookings'),
  // PATCH /api/bookings/:id/status — 取消預約
  cancelBooking: (id) => api.patch(`/bookings/${id}/status`, { status: 'CANCELLED' }),
}
