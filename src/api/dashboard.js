/**
 * 儀表板 API 模組
 * 對應後端：DashboardController → /api/admins/dashboard/**
 */
import api from './index'

export const dashboardApi = {
  // 總覽卡片數據（總會員、今日/本週/本月新增）
  getStats: () => api.get('/admins/dashboard/stats'),

  // 男女比例統計
  getGenderDistribution: () => api.get('/admins/dashboard/gender'),

  // 年齡分佈統計
  getAgeDistribution: () => api.get('/admins/dashboard/age'),

  // 會員成長趨勢（近 12 個月）
  getMonthlyGrowth: () => api.get('/admins/dashboard/growth'),

  // 會員等級分佈
  getLevelDistribution: () => api.get('/admins/dashboard/level'),
}
