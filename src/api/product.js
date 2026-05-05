/**
 * 商品 API 模組
 * 對應後端：ProductRestController → /api/products/**
 */
import api from './index'

export const productApi = {
  // GET /api/products — 取得所有商品
  findAll: () => api.get('/products'),

  // GET /api/products/:id — 取得單筆商品
  findById: (id) => api.get(`/products/${id}`),

  // POST /api/products — 新增商品
  create: (product) => api.post('/products', product),

  // PUT /api/products/:id — 更新商品
  update: (id, product) => api.put(`/products/${id}`, product),

  // PATCH /api/products/:id/status — 變更商品狀態
  updateStatus: (id, status) => api.patch(`/products/${id}/status`, { status }),

  // DELETE /api/products/:id — 刪除商品
  delete: (id) => api.delete(`/products/${id}`),

  // POST /api/products/upload — 上傳商品圖片
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/products/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
