import axios from 'axios'

// 建立一個專門給 API 用的 axios 實體
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true // 允許跨域攜帶 Cookie (如果之後有 Session 驗證)
})

export const paymentApi = {
  /**
   * 申請 LINE Pay 付款網址
   * @param {Object} data { orderId, amount, productName }
   */
  linePayRequest: (data) => api.post('/payment/linepay/request', data),

  /**
   * 確認 LINE Pay 扣款
   * @param {Object} data { transactionId, amount, orderId }
   */
  linePayConfirm: (data) => api.post('/payment/linepay/confirm', data)
}
