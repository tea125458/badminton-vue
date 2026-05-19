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
const errorType = ref('') // 'timeout' | 'invalid' | 'confirm_fail' | 'network'

onMounted(async () => {
  // 從 URL 取得參數 (LINE Pay 回傳時會附在網址上)
  const transactionId = route.query.transactionId
  const orderId = route.query.orderId

  // ★ 情境一：網址缺少必要參數（可能是逾時後 LINE Pay 回傳了不完整的資訊）
  if (!transactionId || !orderId) {
    errorType.value = 'invalid'
    statusMsg.value = '付款連線已中斷，請放心，您的帳戶不會被扣款。'
    isError.value = true
    return
  }

  // 從 localStorage 取回當初 Request 時的金額
  const amount = parseInt(localStorage.getItem(`linePay_amt_${orderId}`))

  // ★ 情境二：localStorage 中找不到金額資訊（可能是頁面閒置太久、Session 過期）
  if (!amount || isNaN(amount)) {
    errorType.value = 'timeout'
    statusMsg.value = '付款頁面已逾時，請放心，您的帳戶不會被扣款。'
    isError.value = true
    return
  }

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
    } else {
      // ★ 情境三：後端回傳確認失敗（LINE Pay 那端拒絕或逾時）
      errorType.value = 'confirm_fail'
      statusMsg.value = '付款驗證未通過，這筆交易不會產生扣款。'
      isError.value = true
    }
  } catch (err) {
    console.error('[LINE Pay Callback] 錯誤:', err)
    
    // ★ 情境四：網路異常或後端無回應
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      errorType.value = 'timeout'
      statusMsg.value = '連線逾時，請放心，您的帳戶不會被扣款。'
    } else if (!navigator.onLine) {
      errorType.value = 'network'
      statusMsg.value = '目前網路連線不穩定，請確認網路後再試一次。'
    } else {
      errorType.value = 'confirm_fail'
      statusMsg.value = '付款核對過程發生異常，這筆交易不會產生扣款。'
    }
    isError.value = true
  }
})

function retryCheckout() {
  router.push('/checkout')
}

function goToOrders() {
  router.push({ path: '/profile', query: { tab: 'orders' } })
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="callback-page">
    <div class="callback-card" :class="{ 'error-card': isError, 'success-card': !isError && !isLoading }">
      
      <!-- ====== 載入中：核對付款 ====== -->
      <div v-if="isLoading" class="state-wrap">
        <div class="loading-ring">
          <div class="ring-spinner"></div>
          <i class="bi bi-shield-lock-fill ring-icon"></i>
        </div>
        <h3 class="state-title mt-4">安全核對中</h3>
        <p class="state-desc">正在與 LINE Pay 進行最終付款確認，請稍候...</p>
        <div class="security-badge">
          <i class="bi bi-lock-fill me-1"></i>交易資訊已加密保護
        </div>
      </div>

      <!-- ====== 錯誤：友善提示畫面 ====== -->
      <div v-else-if="isError" class="state-wrap">
        <div class="error-icon-wrap">
          <div class="error-icon-bg">
            <i class="bi bi-arrow-clockwise error-main-icon"></i>
          </div>
        </div>

        <h3 class="state-title mt-4">交易需要重新處理</h3>
        
        <p class="state-desc">{{ statusMsg }}</p>

        <!-- 安撫文案區塊 -->
        <div class="reassure-box">
          <div class="reassure-item">
            <i class="bi bi-shield-check reassure-icon"></i>
            <span>您的付款帳戶<strong>不會被扣款</strong></span>
          </div>
          <div class="reassure-item">
            <i class="bi bi-cart-check reassure-icon"></i>
            <span>購物車商品仍為您保留中</span>
          </div>
          <div class="reassure-item">
            <i class="bi bi-arrow-repeat reassure-icon"></i>
            <span>重新結帳即可完成訂購</span>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="action-buttons">
          <button class="btn-primary-action" @click="retryCheckout">
            <i class="bi bi-cart3 me-2"></i>返回重新結帳
          </button>
          <button class="btn-secondary-action" @click="goToOrders">
            <i class="bi bi-receipt me-2"></i>查看我的訂單
          </button>
        </div>

        <button class="btn-text-link" @click="goHome">
          <i class="bi bi-house me-1"></i>回到首頁
        </button>
      </div>

      <!-- ====== 成功 ====== -->
      <div v-else class="state-wrap">
        <div class="success-icon-wrap">
          <div class="success-icon-bg">
            <i class="bi bi-check-lg success-main-icon"></i>
          </div>
        </div>
        <h3 class="state-title success-title mt-4">付款成功！</h3>
        <p class="state-desc">正在為您跳轉至訂單頁面...</p>
        <div class="success-progress">
          <div class="success-progress-bar"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* =====================================================
   LINE Pay Callback — 業界級友善回饋頁面
   ===================================================== */
.callback-page {
  min-height: calc(100vh - 70px);
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 50%, #f0fdf4 100%);
  padding: 2rem;
}

.callback-card {
  background: white;
  padding: 3rem 2.5rem;
  border-radius: 1.25rem;
  box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.08), 0 4px 20px -4px rgba(0, 0, 0, 0.04);
  text-align: center;
  max-width: 460px;
  width: 100%;
  transition: all 0.4s ease;
  animation: cardSlideUp 0.5s ease-out;
}

@keyframes cardSlideUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 狀態通用 ===== */
.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.state-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0.5rem;
  letter-spacing: -0.3px;
}

.state-desc {
  font-size: 0.92rem;
  color: #64748b;
  line-height: 1.7;
  max-width: 340px;
}

/* ===== 載入中動畫 ===== */
.loading-ring {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-spinner {
  position: absolute;
  width: 80px;
  height: 80px;
  border: 3px solid #e2e8f0;
  border-top-color: #06C755;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.ring-icon {
  font-size: 1.8rem;
  color: #06C755;
  z-index: 2;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.security-badge {
  display: inline-flex;
  align-items: center;
  margin-top: 1.5rem;
  padding: 0.4rem 1rem;
  font-size: 0.78rem;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 2rem;
}

/* ===== 錯誤狀態 ===== */
.error-icon-wrap {
  position: relative;
}

.error-icon-bg {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFF7ED, #FFEDD5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: gentlePulse 2s ease-in-out infinite;
}

.error-main-icon {
  font-size: 2.5rem;
  color: #ea580c;
}

@keyframes gentlePulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.15); }
  50% { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(234, 88, 12, 0); }
}

/* ===== 安撫區塊 ===== */
.reassure-box {
  width: 100%;
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reassure-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.88rem;
  color: #334155;
  text-align: left;
}

.reassure-icon {
  font-size: 1.1rem;
  color: #16a34a;
  flex-shrink: 0;
}

/* ===== 按鈕 ===== */
.action-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.5rem;
}

.btn-primary-action {
  width: 100%;
  padding: 0.85rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #06C755, #05a847);
  border: none;
  border-radius: 0.65rem;
  cursor: pointer;
  transition: all 0.25s;
  letter-spacing: 0.3px;
}

.btn-primary-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(6, 199, 85, 0.35);
}

.btn-secondary-action {
  width: 100%;
  padding: 0.75rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.65rem;
  cursor: pointer;
  transition: all 0.25s;
}

.btn-secondary-action:hover {
  background: #e2e8f0;
}

.btn-text-link {
  margin-top: 1rem;
  background: none;
  border: none;
  font-size: 0.82rem;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-text-link:hover {
  color: #64748b;
}

/* ===== 成功狀態 ===== */
.success-icon-wrap {
  position: relative;
}

.success-icon-bg {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #DCFCE7, #BBF7D0);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: successBounce 0.6s ease-out;
}

.success-main-icon {
  font-size: 2.8rem;
  color: #16a34a;
}

@keyframes successBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.success-title {
  color: #16a34a;
}

.success-progress {
  width: 60%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  margin-top: 1.5rem;
  overflow: hidden;
}

.success-progress-bar {
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, #06C755, #16a34a);
  border-radius: 2px;
  animation: progressFill 2s ease-out forwards;
}

@keyframes progressFill {
  to { width: 100%; }
}

/* ===== RWD ===== */
@media (max-width: 480px) {
  .callback-card {
    padding: 2rem 1.5rem;
    border-radius: 1rem;
  }
  .state-title {
    font-size: 1.2rem;
  }
}
</style>
