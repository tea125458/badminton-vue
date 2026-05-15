/**
 * 操作日誌 API 模組
 * 對應後端：SystemLogController → /api/admins/logs/**
 */
import api from './index'

export const systemLogApi = {
  // 取得日誌列表（支援篩選）
  getLogs: (params = {}) => api.get('/admins/logs', { params }),

  // 關鍵字搜尋
  searchLogs: (keyword) => api.get('/admins/logs/search', { params: { keyword } }),
}
