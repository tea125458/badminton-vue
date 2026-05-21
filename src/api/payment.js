import api from './index'

/**
 * 金流 API 模組
 *
 * ★ 使用共用 axios 實例（@/api/index.js），確保：
 *   1. 走 Vite Proxy（不跨域，避免 CORS 問題）
 *   2. 自動攜帶 JWT Token（經過 Request 攔截器）
 *   3. Response 攔截器自動解包 response.data
 *
 * 舊版曾用獨立 axios.create({ baseURL: 'http://localhost:8080/api' })，
 * 導致首次開啟頁面時因 CORS preflight 未快取而出現 400 錯誤。
 */
export const paymentApi = {
  /**
   * 申請 LINE Pay 付款網址
   * @param {Object} data { orderId, amount, productName }
   * @returns {Promise} 回傳 { success, paymentUrl, transactionId }
   */
  linePayRequest: (data) => api.post('/payment/linepay/request', data),

  /**
   * 確認 LINE Pay 扣款
   * @param {Object} data { transactionId, amount, orderId }
   * @returns {Promise} 回傳 { success, message }
   */
  linePayConfirm: (data) => api.post('/payment/linepay/confirm', data)
}
