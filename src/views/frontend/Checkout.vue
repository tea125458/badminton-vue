<script setup>
/**
 * 結帳頁面（Aesop 風格改版）
 *
 * 業務模式：線上訂購、球館自取（不需收件地址）
 *
 * 流程：
 * 1. 從 Pinia cart store 讀取購物車內容（唯讀顯示）
 * 2. 選擇付款方式（對應 PaymentType Enum: CASH / CREDIT_CARD / TRANSFER / LINE_PAY）
 * 3. 填寫備註（選填，對應 Orders.note）
 * 4. 點擊「確認下單」→ 呼叫後端 API 建立訂單 + 明細
 * 5. 成功後清空購物車 → 跳轉到訂單成功頁
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { orderApi } from '@/api/order'
import CreditCardMock from '@/components/payment/CreditCardMock.vue'
import { useLinePay } from '@/composables/useLinePay'

const router = useRouter()
const { requestPayment } = useLinePay()
const cart = useCartStore()
const isSubmitting = ref(false)
const showCreditCardModal = ref(false)

// 表單資料
const paymentType = ref('CASH')
const note = ref('')

// 付款方式選項（對應後端 PaymentType Enum）
const paymentOptions = [
  { value: 'CASH', label: '現場現金支付', icon: 'bi-cash-stack', desc: '打球時至櫃檯付款' },
  { value: 'CREDIT_CARD', label: '信用卡', icon: 'bi-credit-card', desc: '支援 VISA / MasterCard/ JCB/ American Express' },
  { value: 'TRANSFER', label: '銀行轉帳', icon: 'bi-bank', desc: '下單後請於 24 小時內完成匯款' },
  { value: 'LINE_PAY', label: 'LINE Pay', icon: 'bi-chat-fill', desc: '使用 LINE Pay 行動支付' },
]

const cardLogos = [
  { name: 'Visa', src: 'https://img.icons8.com/color/96/visa.png' },
  { name: 'MasterCard', src: 'https://img.icons8.com/color/96/mastercard-logo.png' },
  { name: 'JCB', src: 'https://img.icons8.com/color/96/jcb.png' },
  { name: 'Amex', src: 'https://img.icons8.com/color/96/amex.png' }
]

onMounted(() => {
  if (cart.items.length === 0) {
    alert('購物車是空的，請先加入商品！')
    router.push('/products')
  }
})

// 送出訂單
async function handleSubmit() {
  if (isSubmitting.value) return
  if (cart.items.length === 0) return

  if (paymentType.value === 'CREDIT_CARD') {
    // 彈出虛擬刷卡機
    showCreditCardModal.value = true
    return
  }

  // 其他付款方式直接建立訂單
  await processOrder()
}

// 實際送出訂單到後端
async function processOrder() {
  // TODO: 登入機制完成後，改為從 authStore 取得 memberId
  // 目前先用 memberId = 1（王小明）做 Demo
  const memberId = 1

  isSubmitting.value = true
  try {
    // Step 1: 建立訂單主檔
    const newOrder = await orderApi.create({
      member: { memberId: memberId },
      totalAmount: cart.total,
      paymentType: paymentType.value,
      note: note.value || null,
    })

    // Step 2: 逐筆建立訂單明細（後端會自動扣庫存 + 計算 subtotal）
    for (const item of cart.items) {
      await orderApi.createItem(newOrder.orderId, {
        product: { productId: item.id },
        quantity: item.qty,
        unitPrice: item.price,
      })
    }

    // Step 3: 判斷金流跳轉
    if (paymentType.value === 'LINE_PAY') {
      // 🚀 進入 LINE Pay 流程
      await requestPayment({
        orderId: `ORD-${newOrder.orderId}`,
        amount: cart.total,
        productName: `羽過天晴商品訂單 #${newOrder.orderId}`
      })
    } else {
      // 現金、轉帳、信用卡(已模擬成功) → 直接導向成功頁
      cart.clear()
      router.push({
        path: '/order-success',
        query: { orderId: newOrder.orderId }
      })
    }

  } catch (e) {
    console.error('訂單建立失敗', e)
    alert('訂單建立失敗：' + (e.response?.data?.message || e.message))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="checkout-page">
    <div class="checkout-container">
      <!-- 頁面大標題 -->
      <h1 class="checkout-title">結帳</h1>

      <div class="checkout-layout">
        <!-- ==================== 左側：結帳表單 ==================== -->
        <div class="checkout-left">

          <!-- Section 1: 取貨資訊 -->
          <section class="checkout-section">
            <div class="section-header">
              <div class="section-header-left">
                <i class="bi bi-check-circle-fill section-check"></i>
                <span class="section-title-text">取貨資訊</span>
              </div>
              <span class="section-step">步驟 1/3</span>
            </div>
            <div class="section-body">
              <div class="pickup-box">
                <div class="pickup-method">球館自取 (羽過天晴羽球館)</div>
                <div class="pickup-address">
                  訂單成立後，請於打球時間至球館櫃檯領取商品
                </div>
                <div class="pickup-tag">
                  <i class="bi bi-geo-alt-fill me-1"></i>免運費
                </div>
              </div>
            </div>
          </section>

          <!-- Section 2: 付款方式 -->
          <section class="checkout-section">
            <div class="section-header">
              <div class="section-header-left">
                <i class="bi bi-wallet2 section-icon"></i>
                <span class="section-title-text">付款方式</span>
              </div>
              <span class="section-step">步驟 2/3</span>
            </div>
            <div class="section-body">
              <div class="payment-list">
                <label v-for="opt in paymentOptions" :key="opt.value" class="payment-option"
                  :class="{ active: paymentType === opt.value }">
                  <input type="radio" v-model="paymentType" :value="opt.value" />
                  <div class="payment-radio-circle">
                    <div class="payment-radio-dot"></div>
                  </div>
                  <div class="payment-info">
                    <span class="payment-label">{{ opt.label }}</span>
                    <div v-if="opt.value === 'CREDIT_CARD'" class="payment-desc-wrap">
                      <span class="payment-desc">支援</span>
                      <span class="card-inline-logos">
                        <template v-for="(logo, idx) in cardLogos" :key="logo.name">
                          <span class="card-name-logo">{{ logo.name }}<img :src="logo.src" :alt="logo.name" class="card-logo-sm" /></span>
                          <span v-if="idx < cardLogos.length - 1" class="card-sep">/</span>
                        </template>
                      </span>
                    </div>
                    <span v-else-if="opt.value === 'LINE_PAY'" class="payment-desc">
                      使用 LINE Pay <img src="https://img.icons8.com/color/96/line-me.png" alt="LINE Pay" class="card-logo-sm" style="height: 19px;" /> 行動支付
                    </span>
                    <span v-else class="payment-desc">{{ opt.desc }}</span>
                  </div>
                </label>
              </div>
            </div>
          </section>

          <!-- Section 3: 備註 -->
          <section class="checkout-section">
            <div class="section-header">
              <div class="section-header-left">
                <i class="bi bi-sticky section-icon"></i>
                <span class="section-title-text">訂單備註</span>
              </div>
              <span class="section-step">步驟 3/3</span>
            </div>
            <div class="section-body">
              <textarea v-model="note" class="note-textarea" rows="3" placeholder="有什麼想告訴我們的嗎？（選填）"></textarea>
            </div>
          </section>

        </div>

        <!-- ==================== 右側：訂單詳情 ==================== -->
        <div class="checkout-right">
          <div class="order-detail-card">
            <!-- 標題列 -->
            <div class="order-detail-header">
              <h3 class="order-detail-title">
                您的訂單詳情
                <span class="item-count">({{ cart.count }}樣商品)</span>
              </h3>
              <router-link to="/cart" class="edit-cart-link">編輯購物車</router-link>
            </div>

            <!-- 商品列表 -->
            <div class="order-products">
              <div v-for="item in cart.items" :key="item.id" class="order-product-item">
                <div class="product-img-wrap">
                  <img v-if="item.imageUrl"
                    :src="item.imageUrl.startsWith('/') || item.imageUrl.startsWith('http') ? item.imageUrl : '/' + item.imageUrl"
                    :alt="item.name" class="product-img" />
                  <div v-else class="product-img-placeholder">
                    <i class="bi bi-box-seam"></i>
                  </div>
                </div>
                <div class="product-details">
                  <div class="product-name">{{ item.name }}</div>
                  <div class="product-brand" v-if="item.brand">{{ item.brand }}</div>
                  <div class="product-qty">數量：{{ item.qty }}</div>
                </div>
                <div class="product-price">
                  NT${{ (item.price * item.qty).toLocaleString() }}
                </div>
              </div>
            </div>

            <!-- 金額摘要 -->
            <div class="order-summary">
              <div class="summary-row">
                <span>小計</span>
                <span>NT${{ cart.total.toLocaleString() }}</span>
              </div>
              <div class="summary-row">
                <span>
                  運費
                  <span class="shipping-method">球館自取</span>
                </span>
                <span class="free-shipping">免運</span>
              </div>
              <div class="summary-row total-row">
                <span>總計</span>
                <span class="total-price">NT${{ cart.total.toLocaleString() }}</span>
              </div>
            </div>

            <!-- 下單按鈕 -->
            <div class="order-submit-wrap">
              <button @click="handleSubmit" class="submit-btn" :disabled="isSubmitting || cart.items.length === 0">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                {{ isSubmitting ? '訂單處理中...' : '確認下單' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 信用卡虛擬刷卡機 Modal -->
    <CreditCardMock v-if="showCreditCardModal" :amount="cart.total" @close="showCreditCardModal = false"
      @payment-success="() => { showCreditCardModal = false; processOrder() }" />
  </div>
</template>

<style scoped>
/* =====================================================
   結帳頁面 — Aesop 風格（保留原色系）
   ===================================================== */
.checkout-page {
  min-height: 100vh;
  background: #FAFBFC;
  padding: 2.5rem 1rem 4rem;
}

.checkout-container {
  max-width: 1100px;
  margin: 0 auto;
}

/* ===== 頁面標題 ===== */
.checkout-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--brand-dark, #1E293B);
  margin-bottom: 2.5rem;
  letter-spacing: -0.5px;
}

/* ===== 雙欄佈局 ===== */
.checkout-layout {
  display: grid;
  grid-template-columns: 1fr 462px;
  gap: 3rem;
  align-items: start;
}

/* ===== 左側區塊 ===== */
.checkout-left {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ===== Section 通用 ===== */
.checkout-section {
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 1.75rem;
  margin-bottom: 1.75rem;
}

.checkout-section:last-of-type {
  border-bottom: none;
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-check {
  font-size: 1.1rem;
  color: var(--brand-teal, #0D9488);
}

.section-icon {
  font-size: 1.1rem;
  color: var(--brand-sky, #0EA5E9);
}

.section-title-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--brand-dark, #1E293B);
}

.section-step {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94A3B8;
  letter-spacing: 0.3px;
}

.section-body {
  padding-left: 0.25rem;
}

/* ===== 取貨資訊 ===== */
.pickup-box {
  border: 1px solid #E2E8F0;
  border-radius: 0.5rem;
  padding: 1.25rem 1.5rem;
  background: #FFFFFF;
}

.pickup-method {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--brand-dark, #1E293B);
  margin-bottom: 0.4rem;
}

.pickup-address {
  font-size: 0.82rem;
  color: #64748B;
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.pickup-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--brand-teal, #0D9488);
  background: #F0FDFA;
  padding: 0.3rem 0.75rem;
  border-radius: 2rem;
  border: 1px solid #CCFBF1;
}

/* ===== 付款方式（Radio 風格） ===== */
.payment-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 0;
  border-bottom: 1px solid #F1F5F9;
  cursor: pointer;
  transition: background 0.15s;
}

.payment-option:last-child {
  border-bottom: none;
}

.payment-option:hover {
  background: #FAFBFC;
}

.payment-option input[type="radio"] {
  display: none;
}

.payment-radio-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.2s;
}

.payment-option.active .payment-radio-circle {
  border-color: var(--brand-teal, #0D9488);
}

.payment-radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.2s;
}

.payment-option.active .payment-radio-dot {
  background: var(--brand-teal, #0D9488);
}

.payment-info {
  display: flex;
  flex-direction: column;
}

.payment-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--brand-dark, #1E293B);
}

.payment-desc {
  font-size: 0.75rem;
  color: #94A3B8;
  margin-top: 0.15rem;
}

/* ===== 備註 ===== */
.note-textarea {
  width: 100%;
  border: 1px solid #E2E8F0;
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
  font-size: 0.88rem;
  color: var(--brand-dark, #1E293B);
  resize: vertical;
  transition: border-color 0.2s;
  outline: none;
  font-family: inherit;
}

.note-textarea:focus {
  border-color: var(--brand-teal, #0D9488);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
}

.note-textarea::placeholder {
  color: #94A3B8;
}

/* ===== 下單按鈕 ===== */
.submit-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  background: var(--brand-teal, #0D9488);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  letter-spacing: 0.5px;
}

.submit-btn:hover:not(:disabled) {
  background: #0F766E;
  transform: translateY(-1px);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ===== 右側：訂單詳情 ===== */
.order-detail-card {
  position: sticky;
  top: 1.5rem;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 0.5rem;
  padding: 0;
  overflow: hidden;
}

.order-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #F1F5F9;
}

.order-detail-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--brand-dark, #1E293B);
  margin: 0;
}

.item-count {
  font-weight: 400;
  font-size: 0.9rem;
  color: #64748B;
}

.edit-cart-link {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--brand-teal, #0D9488);
  text-decoration: none;
  white-space: nowrap;
}

.edit-cart-link:hover {
  text-decoration: underline;
}

/* ===== 商品列表 ===== */
.order-products {
  padding: 0;
}

.order-product-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #F1F5F9;
}

.order-product-item:last-child {
  border-bottom: 1px solid #E2E8F0;
}

.product-img-wrap {
  flex-shrink: 0;
}

.product-img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 0.375rem;
  border: 1px solid #F1F5F9;
}

.product-img-placeholder {
  width: 72px;
  height: 72px;
  background: #F1F5F9;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #CBD5E1;
  font-size: 1.5rem;
}

.product-details {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--brand-dark, #1E293B);
  line-height: 1.4;
  margin-bottom: 0.2rem;
}

.product-brand {
  font-size: 0.75rem;
  color: #94A3B8;
  margin-bottom: 0.35rem;
}

.product-qty {
  font-size: 0.8rem;
  color: #64748B;
}

.product-price {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--brand-dark, #1E293B);
  white-space: nowrap;
  align-self: flex-start;
  padding-top: 0.1rem;
}

/* ===== 金額摘要 ===== */
.order-summary {
  padding: 1.25rem 1.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
  color: #475569;
  padding: 0.45rem 0;
}

.shipping-method {
  font-size: 0.75rem;
  color: #94A3B8;
  margin-left: 0.35rem;
}

.free-shipping {
  font-weight: 600;
  color: var(--brand-teal, #0D9488);
}

.total-row {
  border-top: 1px solid #E2E8F0;
  margin-top: 0.5rem;
  padding-top: 1rem;
}

.total-row span:first-child {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--brand-dark, #1E293B);
}

.total-price {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--brand-dark, #1E293B);
}

/* ===== 信用卡圖示 ===== */
.payment-desc-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 2px;
}

.card-inline-logos {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.card-name-logo {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.78rem;
  color: #475569;
}

.card-logo-sm {
  height: 17px;
  width: auto;
  vertical-align: middle;
}

.card-sep {
  color: #94a3b8;
  font-size: 0.78rem;
  margin: 0 1px;
}

/* ===== 下單按鈕（右側卡片內） ===== */
.order-submit-wrap {
  padding: 0 1.5rem 1.5rem;
}

/* ===== RWD ===== */
@media (max-width: 900px) {
  .checkout-layout {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .checkout-right {
    order: -1;
  }

  .order-detail-card {
    position: static;
  }
}

@media (max-width: 576px) {
  .checkout-title {
    font-size: 1.5rem;
  }

  .order-product-item {
    padding: 1rem;
  }

  .product-img {
    width: 56px;
    height: 56px;
  }
}
</style>
