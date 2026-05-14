<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  amount: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['payment-success', 'close'])

const cardNumber = ref('')
const cardHolder = ref('')
const expiryDate = ref('')
const cvc = ref('')
const isFlipped = ref(false)
const isProcessing = ref(false)
const isSuccess = ref(false)

// 格式化卡號 (XXXX XXXX XXXX XXXX)
const formatCardNumber = (e) => {
  let val = e.target.value.replace(/\D/g, '')
  if (val.length > 16) val = val.slice(0, 16)
  cardNumber.value = val.replace(/(\d{4})(?=\d)/g, '$1 ')
}

// 格式化有效期限 (MM/YY)
const formatExpiry = (e) => {
  let val = e.target.value.replace(/\D/g, '')
  if (val.length > 4) val = val.slice(0, 4)
  if (val.length >= 2) {
    expiryDate.value = val.slice(0, 2) + '/' + val.slice(2)
  } else {
    expiryDate.value = val
  }
}

// 格式化 CVC
const formatCvc = (e) => {
  let val = e.target.value.replace(/\D/g, '')
  if (val.length > 3) val = val.slice(0, 3)
  cvc.value = val
}

const isValid = computed(() => {
  return cardNumber.value.length === 19 &&
    cardHolder.value.length > 0 &&
    expiryDate.value.length === 5 &&
    cvc.value.length === 3
})

const handlePay = () => {
  if (!isValid.value) return
  isProcessing.value = true

  // 模擬授權過程
  setTimeout(() => {
    isProcessing.value = false
    isSuccess.value = true

    // 成功後延遲 1.5 秒再關閉 Modal 並通知父層
    setTimeout(() => {
      emit('payment-success')
    }, 1500)
  }, 2000)
}
</script>

<template>
  <div class="cc-modal-overlay" @click.self="$emit('close')">
    <div class="cc-modal-content">

      <!-- 關閉按鈕 -->
      <button class="btn-close-modal" @click="$emit('close')" :disabled="isProcessing || isSuccess">
        <i class="bi bi-x-lg"></i>
      </button>

      <h3 class="modal-title">信用卡安全支付</h3>
      <p class="modal-amount">付款金額：<span>NT$ {{ amount.toLocaleString() }}</span></p>

      <!-- 翻轉卡片動畫區塊 -->
      <div class="card-scene">
        <div class="card-container" :class="{ 'is-flipped': isFlipped }">

          <!-- 卡片正面 -->
          <div class="card-face card-front">
            <div class="card-chip"></div>
            <div class="card-logo"><i class="bi bi-credit-card-2-front"></i> VISA</div>
            <div class="card-number-display">{{ cardNumber || 'XXXX XXXX XXXX XXXX' }}</div>
            <div class="card-details">
              <div class="detail-group">
                <label>持卡人姓名</label>
                <div>{{ cardHolder || 'CARD HOLDER' }}</div>
              </div>
              <div class="detail-group text-end">
                <label>有效期限</label>
                <div>{{ expiryDate || 'MM/YY' }}</div>
              </div>
            </div>
          </div>

          <!-- 卡片背面 -->
          <div class="card-face card-back">
            <div class="card-stripe"></div>
            <div class="card-cvc-box">
              <label>CVC</label>
              <div class="cvc-display">{{ cvc || '***' }}</div>
            </div>
          </div>

        </div>
      </div>

      <!-- 表單區塊 -->
      <div v-if="!isSuccess" class="payment-form">
        <div class="form-group">
          <label>信用卡號</label>
          <input type="text" :value="cardNumber" @input="formatCardNumber" placeholder="0000 0000 0000 0000"
            @focus="isFlipped = false" :disabled="isProcessing" maxlength="19" />
        </div>

        <div class="form-group">
          <label>持卡人姓名</label>
          <input type="text" v-model="cardHolder" placeholder="請輸入姓名" @focus="isFlipped = false"
            :disabled="isProcessing" />
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label>有效期限</label>
            <input type="text" :value="expiryDate" @input="formatExpiry" placeholder="MM/YY" @focus="isFlipped = false"
              :disabled="isProcessing" />
          </div>
          <div class="form-group half">
            <label>安全碼 (CVC)</label>
            <input type="text" :value="cvc" @input="formatCvc" placeholder="123" @focus="isFlipped = true"
              @blur="isFlipped = false" :disabled="isProcessing" />
          </div>
        </div>

        <button class="btn-pay" :class="{ 'processing': isProcessing }" :disabled="!isValid || isProcessing"
          @click="handlePay">
          <span v-if="!isProcessing">確認付款 NT$ {{ amount.toLocaleString() }}</span>
          <span v-else><i class="bi bi-arrow-repeat spinner"></i> 授權連線中...</span>
        </button>
      </div>

      <!-- 成功畫面 -->
      <div v-else class="success-state">
        <div class="success-circle">
          <i class="bi bi-check-lg"></i>
        </div>
        <h4>授權成功！</h4>
        <p>即將為您建立訂單...</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Modal 遮罩 */
.cc-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

/* Modal 內容 */
.cc-modal-content {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  position: relative;
  animation: slideUp 0.3s ease-out forwards;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn-close-modal {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #64748b;
  cursor: pointer;
}

.modal-title {
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.modal-amount {
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.modal-amount span {
  font-weight: 700;
  color: #0d9488;
}

/* --- 卡片動畫區塊 --- */
.card-scene {
  perspective: 1000px;
  margin-bottom: 2rem;
}

.card-container {
  width: 100%;
  height: 200px;
  position: relative;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
}

.card-container.is-flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  color: white;
  padding: 1.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
}

/* 正面樣式 */
.card-front {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-chip {
  width: 45px;
  height: 35px;
  background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.card-chip::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
}

.card-logo {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-style: italic;
  font-weight: 800;
  font-size: 1.2rem;
}

.card-number-display {
  font-size: 1.4rem;
  letter-spacing: 2px;
  font-family: monospace;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  margin-top: 1rem;
}

.card-details {
  display: flex;
  justify-content: space-between;
  text-transform: uppercase;
}

.detail-group label {
  font-size: 0.65rem;
  color: #94a3b8;
  display: block;
  margin-bottom: 0.2rem;
}

.detail-group div {
  font-size: 0.85rem;
  letter-spacing: 1px;
}

/* 背面樣式 */
.card-back {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  transform: rotateY(180deg);
  padding: 0;
}

.card-stripe {
  width: 100%;
  height: 40px;
  background: #000;
  margin-top: 2rem;
}

.card-cvc-box {
  margin: 1.5rem;
  text-align: right;
}

.card-cvc-box label {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-bottom: 0.2rem;
  display: block;
}

.cvc-display {
  background: white;
  color: #000;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-family: monospace;
  letter-spacing: 2px;
}

/* --- 表單區塊 --- */
.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.3rem;
  display: block;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  outline: none;
}

.form-group input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.half {
  flex: 1;
}

.btn-pay {
  margin-top: 1rem;
  width: 100%;
  padding: 1rem;
  background: #0d9488;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pay:hover:not(:disabled) {
  background: #0f766e;
  transform: translateY(-1px);
}

.btn-pay:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.btn-pay.processing {
  background: #0f766e;
}

.spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

/* --- 成功狀態 --- */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.success-circle {
  width: 64px;
  height: 64px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.success-state h4 {
  color: #1e293b;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.success-state p {
  color: #64748b;
  font-size: 0.9rem;
}
</style>
