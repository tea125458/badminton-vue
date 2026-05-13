/**
 * 訂單 API 模組
 * 對應後端：OrderRestController → /api/orders/**
 */
import api from './index'

export const orderApi = {
  // ===== 訂單 CRUD =====
  findAll: () => api.get('/orders'),
  findByMemberId: (memberId) => api.get(`/orders?memberId=${memberId}`),
  findById: (id) => api.get(`/orders/${id}`),
  create: (order) => api.post('/orders', order),
  update: (id, order) => api.put(`/orders/${id}`, order),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  delete: (id) => api.delete(`/orders/${id}`),

  // ===== 訂單明細 CRUD =====
  findItems: (orderId) => api.get(`/orders/${orderId}/items`),
  findItemById: (orderId, itemId) => api.get(`/orders/${orderId}/items/${itemId}`),
  createItem: (orderId, item) => api.post(`/orders/${orderId}/items`, item),
  updateItem: (orderId, itemId, item) => api.put(`/orders/${orderId}/items/${itemId}`, item),
  deleteItem: (orderId, itemId) => api.delete(`/orders/${orderId}/items/${itemId}`),
}
