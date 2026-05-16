<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLinePay } from '@/composables/useLinePay'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const { confirmPayment, isLoading } = useLinePay()
const cart = useCartStore()

const statusMsg = ref('正在與 LINE Pay 進行最終核對...')
const isError = ref(false)

onMounted(async () => {
  // 從 URL 取得參數 (LINE Pay 回傳時會附在網址上)
  const transactionId = route.query.transactionId
  const orderId = route.query.orderId

  if (!transactionId || !orderId) {
    statusMsg.value = '無效的付款回傳資訊，請聯繫客服。'
    isError.value = true
    return
  }

  // 從 localStorage 取回當初 Request 時的金額
  const amount = parseInt(localStorage.getItem(`linePay_amt_${orderId}`))

  try {
    const result = await confirmPayment({
      transactionId,
      amount,
      orderId
    })

    if (result.success) {
      statusMsg.value = '付款成功！即將前往訂單頁面...'
      
      // 清除購物車
      cart.clear()
      
      // 清除暫存
      localStorage.removeItem(`linePay_tid_${orderId}`)
      localStorage.removeItem(`linePay_amt_${orderId}`)

      // 延遲跳轉至成功頁面 (或根據前綴跳轉)
      setTimeout(() => {
        if (orderId.startsWith('ORD-')) {
          router.push({ path: '/order-success', query: { orderId: orderId.split('-')[1] } })
        } else if (orderId.startsWith('BKG-')) {
          // 場地預約 LINE Pay 付款成功 → 跳轉到會員中心預約紀錄
          router.push({ path: '/profile', query: { tab: 'bookings' } })
        } else {
          // 其他組員的業務可以導向他們自己的頁面
          router.push('/')
        }
      }, 2000)
    }
  } catch (err) {
    isError.value = true
    statusMsg.value = '付款核對失敗：' + (err.response?.data?.message || err.message)
  }
})
</script>

<template>
  <div class="callback-page">
    <div class="callback-card">
      <div v-if="isLoading" class="spinner-wrap">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
      <div v-else-if="isError" class="error-wrap">
        <i class="bi bi-exclamation-triangle-fill text-danger mb-3" style="font-size: 3rem;"></i>
        <h4>付款發生錯誤</h4>
      </div>
      <div v-else class="success-wrap">
        <i class="bi bi-check-circle-fill text-success mb-3" style="font-size: 3rem;"></i>
        <h4>核對成功</h4>
      </div>
      
      <p class="status-text">{{ statusMsg }}</p>
      
      <button v-if="isError" class="btn btn-primary mt-3" @click="router.push('/')">
        返回首頁
      </button>
    </div>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8fafc;
}

.callback-card {
  background: white;
  padding: 3rem;
  border-radius: 1rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.spinner-wrap, .error-wrap, .success-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
}

.status-text {
  color: #64748b;
  margin-top: 1rem;
}
</style>
