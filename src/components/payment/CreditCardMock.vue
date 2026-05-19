<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  amount: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['payment-success', 'close'])

// 分組輸入：每個框裝多個數字
const cardGroup = ref(['', '', '', ''])  // 4 組，每組 4 碼
const cardHolder = ref('')
const expiryMM = ref('')
const expiryYY = ref('')
const cvc = ref('')

const isFlipped = ref(false)
const isProcessing = ref(false)
const isSuccess = ref(false)

// 卡別選擇
const cardType = ref('VISA')
const cardTypes = [
  { value: 'VISA',    label: 'VISA',             logo: '/visa.svg' },
  { value: 'MASTER',  label: 'MasterCard',        logo: 'https://img.icons8.com/color/96/mastercard-logo.png' },
  { value: 'JCB',     label: 'JCB',               logo: 'https://img.icons8.com/color/96/jcb.png' },
  { value: 'AMEX',    label: 'American Express',   logo: 'https://img.icons8.com/color/96/amex.png' },
]

const isDropdownOpen = ref(false)
const toggleDropdown = () => {
  if (!isProcessing.value) isDropdownOpen.value = !isDropdownOpen.value
}
const selectCardType = (val) => {
  cardType.value = val
  isDropdownOpen.value = false
}

// --- refs ---
const cardGroupRefs = ref([])
const expiryMMRef = ref(null)
const expiryYYRef = ref(null)

// --- 卡號分組輸入 ---
function onCardGroupInput(index, e) {
  let val = e.target.value.replace(/\D/g, '')
  if (val.length > 4) val = val.slice(0, 4)
  cardGroup.value[index] = val
  // 輸滿 4 碼自動跳下一組
  if (val.length === 4 && index < 3) {
    nextTick(() => cardGroupRefs.value[index + 1]?.focus())
  }
}

function onCardGroupKeydown(index, e) {
  // Backspace 在空格時跳回上一組
  if (e.key === 'Backspace' && !cardGroup.value[index] && index > 0) {
    nextTick(() => cardGroupRefs.value[index - 1]?.focus())
  }
}

function onCardGroupPaste(e) {
  e.preventDefault()
  const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 16)
  for (let i = 0; i < 4; i++) {
    cardGroup.value[i] = paste.slice(i * 4, i * 4 + 4)
  }
}

// --- 有效期限 ---
function onExpiryMMInput(e) {
  let val = e.target.value.replace(/\D/g, '')
  if (val.length > 2) val = val.slice(0, 2)
  expiryMM.value = val
  if (val.length === 2) {
    nextTick(() => expiryYYRef.value?.focus())
  }
}

function onExpiryYYInput(e) {
  let val = e.target.value.replace(/\D/g, '')
  if (val.length > 2) val = val.slice(0, 2)
  expiryYY.value = val
}

function onExpiryYYKeydown(e) {
  if (e.key === 'Backspace' && !expiryYY.value) {
    nextTick(() => expiryMMRef.value?.focus())
  }
}

// --- CVC ---
function onCvcInput(e) {
  let val = e.target.value.replace(/\D/g, '')
  if (val.length > 3) val = val.slice(0, 3)
  cvc.value = val
}

// --- 顯示用計算屬性 ---
const cardNumberDisplay = computed(() => {
  const full = cardGroup.value.join('')
  if (!full) return ''
  return cardGroup.value.map(g => g.padEnd(4, ' ')).join(' ').trim()
})

const expiryDisplay = computed(() => {
  const mm = expiryMM.value || ''
  const yy = expiryYY.value || ''
  if (!mm && !yy) return ''
  return mm + '/' + yy
})

// --- 驗證 ---
const isValid = computed(() => {
  return cardGroup.value.every(g => g.length === 4) &&
         cardHolder.value.length > 0 &&
         expiryMM.value.length === 2 &&
         expiryYY.value.length === 2 &&
         cvc.value.length === 3
})

// --- 付款處理 ---
const handlePay = () => {
  if (!isValid.value) return
  isProcessing.value = true

  // 模擬授權過程（4 秒，讓報告有展示時間）
  setTimeout(() => {
    isProcessing.value = false
    isSuccess.value = true

    // 成功畫面展示 3 秒後再跳轉
    setTimeout(() => {
      emit('payment-success')
    }, 3000)
  }, 4000)
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
            <div class="card-logo">
              <img :src="cardTypes.find(c => c.value === cardType)?.logo" class="card-logo-img" :alt="cardType" />
            </div>
            <div class="card-number-display">{{ cardNumberDisplay || 'XXXX XXXX XXXX XXXX' }}</div>
            <div class="card-details">
              <div class="detail-group">
                <label>持卡人姓名</label>
                <div>{{ cardHolder || 'CARD HOLDER' }}</div>
              </div>
              <div class="detail-group text-end">
                <label>有效期限</label>
                <div>{{ expiryDisplay || 'MM/YY' }}</div>
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

        <!-- 卡別選擇 -->
        <div class="form-group">
          <label>卡別</label>
          <div class="custom-dropdown" :class="{ 'is-open': isDropdownOpen, 'is-disabled': isProcessing }">
            <div class="dropdown-selected" @click="isDropdownOpen = !isDropdownOpen">
              <div class="selected-content">
                <img :src="cardTypes.find(c => c.value === cardType)?.logo" class="type-logo" />
                <span>{{ cardTypes.find(c => c.value === cardType)?.label }}</span>
              </div>
              <i class="bi bi-chevron-down dropdown-arrow"></i>
            </div>
            <div v-if="isDropdownOpen" class="dropdown-list">
              <div 
                v-for="ct in cardTypes" 
                :key="ct.value" 
                class="dropdown-item" 
                :class="{ active: cardType === ct.value }"
                @click="selectCardType(ct.value)"
              >
                <img :src="ct.logo" class="type-logo" />
                <span>{{ ct.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 信用卡號：4 個框，每框 4 碼 -->
        <div class="form-group">
          <label>信用卡號</label>
          <div class="card-group-row">
            <template v-for="(g, i) in 4" :key="i">
              <input
                :ref="el => { if (el) cardGroupRefs[i] = el }"
                type="text"
                inputmode="numeric"
                class="card-group-input"
                :value="cardGroup[i]"
                @input="onCardGroupInput(i, $event)"
                @keydown="onCardGroupKeydown(i, $event)"
                @paste="onCardGroupPaste"
                @focus="isFlipped = false"
                :disabled="isProcessing"
                maxlength="4"
                placeholder="0000"
                autocomplete="off"
              />
              <span v-if="i < 3" class="card-group-sep">-</span>
            </template>
          </div>
        </div>

        <!-- 持卡人姓名 -->
        <div class="form-group">
          <label>持卡人姓名</label>
          <input type="text" v-model="cardHolder" placeholder="請輸入姓名" @focus="isFlipped = false"
            :disabled="isProcessing" autocomplete="off" />
        </div>

        <div class="form-row">
          <!-- 有效期限：MM / YY -->
          <div class="form-group" style="flex: 3; min-width: 0;">
            <label>有效期限</label>
            <div class="expiry-group-row">
              <input
                ref="expiryMMRef"
                type="text"
                inputmode="numeric"
                class="expiry-input"
                :value="expiryMM"
                @input="onExpiryMMInput"
                @focus="isFlipped = false"
                :disabled="isProcessing"
                maxlength="2"
                placeholder="MM"
                autocomplete="off"
              />
              <span class="expiry-sep">/</span>
              <input
                ref="expiryYYRef"
                type="text"
                inputmode="numeric"
                class="expiry-input"
                :value="expiryYY"
                @input="onExpiryYYInput"
                @keydown="onExpiryYYKeydown"
                @focus="isFlipped = false"
                :disabled="isProcessing"
                maxlength="2"
                placeholder="YY"
                autocomplete="off"
              />
            </div>
          </div>

          <!-- CVC：1 個框裝 3 碼 -->
          <div class="form-group" style="flex: 2; min-width: 0;">
            <label>安全碼 (CVC)</label>
            <input
              type="text"
              inputmode="numeric"
              class="cvc-input"
              :value="cvc"
              @input="onCvcInput"
              @focus="isFlipped = true"
              @blur="isFlipped = false"
              :disabled="isProcessing"
              maxlength="3"
              placeholder="000"
              autocomplete="off"
            />
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
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
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
  top: 50%; left: 0; right: 0; height: 1px; background: rgba(0,0,0,0.1);
}
.card-logo {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
}

.card-logo-img {
  height: 29px;
  width: auto;
  object-fit: contain;
}

.card-number-display {
  font-size: 1.4rem;
  letter-spacing: 2px;
  font-family: monospace;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
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

.form-group > input:not(.card-group-input):not(.expiry-input):not(.cvc-input) {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  outline: none;
}

.form-group > input:not(.card-group-input):not(.expiry-input):not(.cvc-input):focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

/* ===== 卡別下拉選單 (Custom) ===== */
.custom-dropdown {
  position: relative;
  width: 100%;
  user-select: none;
}

.dropdown-selected {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
}

.custom-dropdown.is-open .dropdown-selected {
  border-color: #0d9488;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.selected-content, .dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.type-logo {
  height: 22px;
  width: 34px;
  object-fit: contain;
}

.dropdown-arrow {
  font-size: 0.8rem;
  color: #64748b;
  transition: transform 0.2s;
}

.custom-dropdown.is-open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
}

.dropdown-item {
  padding: 0.65rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f1f5f9;
}

.dropdown-item.active {
  background: #f0fdfa;
  color: #0d9488;
}

.custom-dropdown.is-disabled {
  opacity: 0.7;
  pointer-events: none;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.half {
  flex: 1;
}

/* ===== 卡號分組輸入：4 個框各裝 4 碼 ===== */
.card-group-row {
  display: flex;
  align-items: center;
  gap: 0;
}

.card-group-input {
  flex: 1;
  min-width: 0;
  padding: 0.65rem 0.5rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  font-family: monospace;
  letter-spacing: 2px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s;
  background: #f8fafc;
  color: #1e293b;
}

.card-group-input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
  background: #fff;
}

.card-group-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.card-group-sep {
  font-size: 1.1rem;
  font-weight: 700;
  color: #94a3b8;
  margin: 0 4px;
  user-select: none;
}

/* ===== 有效期限：MM / YY ===== */
.expiry-group-row {
  display: flex;
  align-items: center;
}

.expiry-input {
  flex: 1;
  min-width: 0;
  padding: 0.65rem 0.5rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  font-family: monospace;
  letter-spacing: 1px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s;
  background: #f8fafc;
  color: #1e293b;
}

.expiry-input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
  background: #fff;
}

.expiry-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.expiry-sep {
  font-size: 1.2rem;
  font-weight: 700;
  color: #94a3b8;
  margin: 0 6px;
  user-select: none;
}

/* ===== CVC：1 個框裝 3 碼 ===== */
.cvc-input {
  width: 100%;
  padding: 0.65rem 0.5rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  font-family: monospace;
  letter-spacing: 3px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s;
  background: #f8fafc;
  color: #1e293b;
}

.cvc-input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
  background: #fff;
}

.cvc-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

/* --- 付款按鈕 --- */
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
  100% { transform: rotate(360deg); }
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
  from { opacity: 0; }
  to { opacity: 1; }
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
