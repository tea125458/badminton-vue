/**
 * Axios 共用實例
 *
 * 功能：
 * 1. 統一設定 baseURL、timeout，所有 API 呼叫不用重複寫
 * 2. Request 攔截器：每次發送請求前自動執行（可加 Token、Loading）
 * 3. Response 攔截器：每次收到回應後自動執行（統一錯誤處理）
 *
 * 使用方式：
 *   import api from '@/api'
 *   const products = await api.get('/products')
 */
import axios from 'axios'

// ========================================
// 建立 axios 實例（共用設定）
// ========================================
const api = axios.create({
  // baseURL: 所有請求的前綴
  // 寫 '/api' 是因為 vite.config.js 的 proxy 會把 /api 轉發到 localhost:8080
  // 所以 api.get('/products') 實際上會變成 GET http://localhost:8080/api/products
  baseURL: '/api',

  // timeout: 請求超時時間（毫秒）
  // 超過 10 秒沒有回應就自動取消請求
  timeout: 10000,

  // headers: 預設的請求標頭
  headers: {
    'Content-Type': 'application/json',
  },
})

// ========================================
// Request 攔截器（送出請求「之前」自動執行）
// ========================================
api.interceptors.request.use(
  (config) => {
    // ✅ 成功的情況：請求正常送出前

    // 自動附加 JWT Token（根據路徑判斷用管理員或會員 Token）
    const url = config.url || ''
    const isAdminApi = url.startsWith('/admins') || url.includes('/api/admins')
    
    const token = isAdminApi
      ? localStorage.getItem('adminToken')
      : (localStorage.getItem('memberToken') || localStorage.getItem('adminToken'))
      
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config // 一定要 return config，否則請求不會送出
  },
  (error) => {
    // ❌ 請求發送失敗（例如網路斷線）
    return Promise.reject(error)
  },
)

// ========================================
// Response 攔截器（收到回應「之後」自動執行）
// ========================================
api.interceptors.response.use(
  (response) => {
    // ✅ HTTP 狀態碼 2xx（成功）
    // 直接回傳 response.data，這樣使用時不用每次寫 .data
    // 原本：const res = await api.get('/products') → res.data
    // 現在：const products = await api.get('/products') → 直接就是資料
    return response.data
  },
  (error) => {
    // ❌ HTTP 狀態碼非 2xx（失敗）
    if (error.response) {
      const { status } = error.response

      switch (status) {
        case 401:
          // 未授權（未登入或 Token 過期）
          console.error('未登入或登入已過期')
          // 之後可以在這裡加自動跳轉登入頁的邏輯
          // router.push('/login')
          break
        case 403:
          console.error('沒有權限存取此資源')
          break
        case 404:
          console.error('請求的資源不存在')
          break
        case 500:
          console.error('伺服器內部錯誤')
          break
        default:
          console.error(`請求失敗，狀態碼: ${status}`)
      }
    } else if (error.request) {
      // 請求已送出但沒收到回應（後端沒開、網路斷線）
      console.error('無法連線到伺服器，請確認後端是否已啟動')
    }

    return Promise.reject(error)
  },
)

export default api
