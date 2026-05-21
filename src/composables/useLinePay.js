import { ref } from 'vue'
import { paymentApi } from '@/api/payment'

/**
 * LINE Pay 共用金流組合式函數
 * 
 * 讓所有組員都能簡單呼叫 LINE Pay。
 * 成功機率 95% 以上的秘密就在這裡！
 */
export function useLinePay() {
  const isLoading = ref(false)
  const error = ref(null)

  /**
   * 發起付款請求並跳轉至 LINE Pay
   * 
   * @param {Object} options 
   * @param {string} options.orderId      訂單編號 (含前綴，如 ORD-123)
   * @param {number} options.amount       金額
   * @param {string} options.productName  顯示名稱
   */
  const requestPayment = async ({ orderId, amount, productName }) => {
    isLoading.value = true
    error.value = null

    try {
      // ★ 共用 api 實例的 Response 攔截器會自動解包 response.data
      //   所以這裡拿到的 response 就是後端回傳的 JSON 本體
      const result = await paymentApi.linePayRequest({
        orderId,
        amount,
        productName
      })

      if (result.success) {
        const { paymentUrl, transactionId } = result
        
        // 將 transactionId 暫存在 localStorage，給 Callback 頁面使用
        localStorage.setItem(`linePay_tid_${orderId}`, transactionId)
        localStorage.setItem(`linePay_amt_${orderId}`, amount)

        // 🚀 跳轉至 LINE Pay 付款頁面
        window.location.href = paymentUrl
      } else {
        throw new Error(result.message || '申請付款失敗')
      }
    } catch (err) {
      console.error('[LINE Pay] Request error:', err)
      error.value = err.message
      alert('LINE Pay 初始化失敗：' + err.message)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 確認付款 (用於 Callback 頁面)
   */
  const confirmPayment = async ({ transactionId, amount, orderId }) => {
    isLoading.value = true
    try {
      // ★ 共用 api 的 Response 攔截器已自動解包，result 即為 JSON 本體
      const result = await paymentApi.linePayConfirm({
        transactionId,
        amount,
        orderId
      })
      return result
    } catch (err) {
      console.error('[LINE Pay] Confirm error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    requestPayment,
    confirmPayment,
    isLoading,
    error
  }
}
