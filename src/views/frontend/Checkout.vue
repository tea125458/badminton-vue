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
// 表單資料
const paymentType = ref('') // 預設空值以利驗證
const note = ref('')

// 發票相關
const invoiceType = ref('') // 初始為空，縮短頁面空間。選項：INDIVIDUAL, DONATION, COMPANY
const carrierType = ref('PAPER') // MOBILE, CERTIFICATE, PAPER
const mobileCarrier = ref('')
const certificateCarrier = ref('')
const donationUnit = ref('')
const donationCode = ref('')
const taxId = ref('')

const showErrors = ref(false)

const donationOptions = [
  { label: '財團法人創世社會福利基金會 (919)', value: '919' },
  { label: '財團法人伊甸社會福利基金會 (25885)', value: '25885' },
  { label: '財團法人陽光社會福利基金會 (13579)', value: '13579' },
  { label: '財團法人台灣兒童暨家庭扶助基金會 (5678)', value: '5678' },
  { label: '財團法人罕見疾病基金會 (520)', value: '520' },
  { label: '--- 自行輸入捐贈碼 ---', value: 'CUSTOM' }
]

// 捐贈碼對應表
const donationMap = {
  '135': '財團法人董氏基金會',
  '001': '財團法人羅慧夫顱顏基金會',
  '888': '財團法人台灣癌症基金會',
  '999': '財團法人喜憨兒社會福利基金會',
  '111': '財團法人弘道老人福利基金會'
}

const autoDonationUnit = computed(() => {
  return donationMap[donationCode.value] || ''
})

// 付款方式選項（加入各品牌的 Logo 圖片）
const paymentOptions = [
  { 
    value: 'CASH', 
    label: '現金支付', 
    logos: ['https://img.icons8.com/color/96/cash.png']
  },
  { 
    value: 'CREDIT_CARD', 
    label: '信用卡', 
    logos: [
      '/visa.svg',
      'https://img.icons8.com/color/96/mastercard-logo.png',
      'https://img.icons8.com/color/96/jcb.png',
      'https://img.icons8.com/color/96/amex.png'
    ]
  },
  { 
    value: 'TRANSFER', 
    label: '銀行轉帳', 
    logos: ['https://img.icons8.com/color/96/bank-building.png']
  },
  { 
    value: 'LINE_PAY', 
    label: 'LINE Pay', 
    logos: ['/linepay.svg'] 
  },
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

  // 驗證
  if (!paymentType.value || !invoiceType.value) {
    showErrors.value = true
    alert('請確認付款方式與發票資訊已填寫！')
    return
  }

  // 發票細節驗證
  if (invoiceType.value === 'INDIVIDUAL') {
    if (carrierType.value === 'MOBILE' && !mobileCarrier.value) { showErrors.value = true; return }
    if (carrierType.value === 'CERTIFICATE' && !certificateCarrier.value) { showErrors.value = true; return }
  } else if (invoiceType.value === 'DONATION') {
    if (!donationUnit.value) { showErrors.value = true; return }
    if (donationUnit.value === 'CUSTOM' && !donationCode.value) { showErrors.value = true; return }
  } else if (invoiceType.value === 'COMPANY') {
    if (!taxId.value) { showErrors.value = true; return }
  }

  if (paymentType.value === 'CREDIT_CARD') {
    // 彈出虛擬刷卡機
    showCreditCardModal.value = true
    return
  }

  // 其他付款方式直接建立訂單（立即可鎖定防止重複提交）
  isSubmitting.value = true
  await processOrder()
}

// 實際送出訂單到後端
async function processOrder() {
  // TODO: 登入機制完成後，改為從 authStore 取得 memberId
  // 目前先用 memberId = 1（王小明）做 Demo
  const memberId = 1

  isSubmitting.value = true
  try {
    let computedCarrier = null
    let computedTaxId = null
    
    if (invoiceType.value === 'INDIVIDUAL') {
      if (carrierType.value === 'MOBILE') computedCarrier = mobileCarrier.value
      else if (carrierType.value === 'CERTIFICATE') computedCarrier = certificateCarrier.value
    } else if (invoiceType.value === 'DONATION') {
      computedCarrier = donationUnit.value === 'CUSTOM' ? donationCode.value : donationUnit.value
    } else if (invoiceType.value === 'COMPANY') {
      computedTaxId = taxId.value
    }

    // Step 1: 建立訂單主檔
    const newOrder = await orderApi.create({
      member: { memberId: memberId },
      totalAmount: cart.total,
      paymentType: paymentType.value,
      note: note.value || null,
      invoiceType: invoiceType.value,
      invoiceCarrier: computedCarrier,
      invoiceTaxId: computedTaxId,
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
      // 現金、轉帳、信用卡(已模擬成功) → 立刻跳轉
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
    <div class="checkout-container py-3">
      <h2 class="checkout-title mb-4">結帳</h2>

      <div class="checkout-layout">
        <div class="checkout-left">

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

          <section class="checkout-section py-2">
            <div class="section-header mb-2 d-flex justify-content-between align-items-center">
              <div class="section-header-left">
                <i class="bi bi-wallet2 section-icon"></i>
                <span class="section-title-text">付款方式</span>
              </div>
              <div v-if="showErrors && !paymentType" class="text-danger small animate__animated animate__shakeX">
                <i class="bi bi-exclamation-triangle-fill me-1"></i>請選擇付款方式
              </div>
            </div>
            <div class="section-body">
              <div class="payment-grid">
                <div v-for="opt in paymentOptions" :key="opt.value" class="payment-card"
                  :class="{ active: paymentType === opt.value }"
                  @click="paymentType = opt.value">
                  
                  <div class="payment-radio-circle me-2 flex-shrink-0">
                    <div class="payment-radio-dot"></div>
                  </div>
                  <span class="payment-card-label">{{ opt.label }}</span>
                  
                  <div class="payment-logos ms-auto d-flex flex-nowrap gap-1 justify-content-end">
                    <img v-for="(logo, idx) in opt.logos" :key="idx" :src="logo" 
                      class="payment-logo-img" 
                      :alt="opt.label">
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="checkout-section py-2">
            <div class="section-header mb-2 d-flex justify-content-between align-items-center">
              <div class="section-header-left">
                <i class="bi bi-receipt section-icon"></i>
                <span class="section-title-text">發票資訊</span>
              </div>
              <div v-if="showErrors && !invoiceType" class="text-danger small animate__animated animate__shakeX">
                <i class="bi bi-exclamation-triangle-fill me-1"></i>請選擇發票形式
              </div>
            </div>
            <div class="section-body">
              <div class="row g-2 mb-3">
                <div class="col-4">
                  <div class="payment-card d-flex align-items-center gap-2 border rounded-3 p-2 h-100 cursor-pointer" 
                    :class="{ 'active': invoiceType === 'INDIVIDUAL' }" @click="invoiceType = 'INDIVIDUAL'">
                    <div class="payment-radio-circle">
                      <div class="payment-radio-dot"></div>
                    </div>
                    <span class="payment-label-sm">個人發票</span>
                  </div>
                </div>
                <div class="col-4">
                  <div class="payment-card d-flex align-items-center gap-2 border rounded-3 p-2 h-100 cursor-pointer" 
                    :class="{ 'active': invoiceType === 'DONATION' }" @click="invoiceType = 'DONATION'">
                    <div class="payment-radio-circle">
                      <div class="payment-radio-dot"></div>
                    </div>
                    <span class="payment-label-sm">捐贈發票</span>
                  </div>
                </div>
                <div class="col-4">
                  <div class="payment-card d-flex align-items-center gap-2 border rounded-3 p-2 h-100 cursor-pointer" 
                    :class="{ 'active': invoiceType === 'COMPANY' }" @click="invoiceType = 'COMPANY'">
                    <div class="payment-radio-circle">
                      <div class="payment-radio-dot"></div>
                    </div>
                    <span class="payment-label-sm">公司發票</span>
                  </div>
                </div>
              </div>

              <div v-if="invoiceType === 'INDIVIDUAL'" class="invoice-detail-panel p-3 rounded-3 bg-light animate__animated animate__fadeInUp">
                <div class="d-flex flex-wrap gap-4 mb-3">
                  <!-- 電子發票 -->
                  <div class="d-flex align-items-center gap-2 cursor-pointer" @click="carrierType = 'PAPER'">
                    <div class="payment-radio-circle" :class="{ 'active-border': carrierType === 'PAPER' }" style="width:18px; height:18px;">
                      <div class="payment-radio-dot" :class="{ 'active-dot': carrierType === 'PAPER' }" style="width:8px; height:8px;"></div>
                    </div>
                    <span class="small" :class="{ 'text-dark fw-bold': carrierType === 'PAPER' }">電子發票</span>
                  </div>
                  <!-- 雲端發票 -->
                  <div class="d-flex align-items-center gap-2 cursor-pointer" @click="carrierType = (carrierType === 'PAPER' ? 'MOBILE' : carrierType)">
                    <div class="payment-radio-circle" :class="{ 'active-border': carrierType !== 'PAPER' }" style="width:18px; height:18px;">
                      <div class="payment-radio-dot" :class="{ 'active-dot': carrierType !== 'PAPER' }" style="width:8px; height:8px;"></div>
                    </div>
                    <span class="small" :class="{ 'text-dark fw-bold': carrierType !== 'PAPER' }">雲端發票</span>
                  </div>
                </div>
                
                <!-- 雲端發票細項 -->
                <div v-if="carrierType !== 'PAPER'" class="p-3 bg-white rounded-3 border animate__animated animate__fadeIn">
                  <div class="d-flex flex-wrap gap-3 mb-3 border-bottom pb-2">
                    <div class="d-flex align-items-center gap-2 cursor-pointer" @click="carrierType = 'MOBILE'">
                      <div class="payment-radio-circle" :class="{ 'active-border': carrierType === 'MOBILE' }" style="width:16px; height:16px;">
                        <div class="payment-radio-dot" :class="{ 'active-dot': carrierType === 'MOBILE' }" style="width:6px; height:6px;"></div>
                      </div>
                      <span class="small text-muted" :class="{ 'text-dark fw-bold': carrierType === 'MOBILE' }">手機條碼載具</span>
                    </div>
                    <div class="d-flex align-items-center gap-2 cursor-pointer" @click="carrierType = 'CERTIFICATE'">
                      <div class="payment-radio-circle" :class="{ 'active-border': carrierType === 'CERTIFICATE' }" style="width:16px; height:16px;">
                        <div class="payment-radio-dot" :class="{ 'active-dot': carrierType === 'CERTIFICATE' }" style="width:6px; height:6px;"></div>
                      </div>
                      <span class="small text-muted" :class="{ 'text-dark fw-bold': carrierType === 'CERTIFICATE' }">自然人憑證載具</span>
                    </div>
                  </div>
                  
                  <div v-if="carrierType === 'MOBILE'" class="floating-input-wrap">
                    <label class="floating-label">手機載具</label>
                    <input type="text" :value="mobileCarrier" @input="e => mobileCarrier = e.target.value.toUpperCase()" class="form-control aesop-input" placeholder="/ABC1234" maxlength="8">
                    <div v-if="showErrors && !mobileCarrier" class="text-danger small mt-1 animate__animated animate__shakeX">
                      <i class="bi bi-exclamation-triangle-fill"></i> 請輸入手機載具
                    </div>
                  </div>
                  <div v-if="carrierType === 'CERTIFICATE'" class="floating-input-wrap">
                    <label class="floating-label">自然人憑證條碼</label>
                    <input type="text" :value="certificateCarrier" @input="e => certificateCarrier = e.target.value.toUpperCase()" class="form-control aesop-input" placeholder="兩碼大寫英文+14碼數字" maxlength="16">
                    <div v-if="showErrors && !certificateCarrier" class="text-danger small mt-1 animate__animated animate__shakeX">
                      <i class="bi bi-exclamation-triangle-fill"></i> 請輸入自然人憑證條碼
                    </div>
                  </div>
                </div>

                <!-- 電子發票細項 (PAPER) -->
                <div v-if="carrierType === 'PAPER'" class="p-2 border-start border-3 border-info bg-white rounded-1 animate__animated animate__fadeIn">
                  <div class="small text-muted">
                    <i class="bi bi-info-circle-fill text-info me-1"></i>
                    發票將於您 **現場取貨時** 隨貨交付電子發票證明聯。
                  </div>
                </div>
              </div>

              <div v-if="invoiceType === 'DONATION'" class="invoice-detail-panel p-3 rounded-3 bg-light animate__animated animate__fadeInUp">
                <div class="floating-input-wrap mb-3 mt-1">
                  <label class="floating-label">捐贈單位</label>
                  <select v-model="donationUnit" class="form-select aesop-input">
                    <option value="">請選擇捐贈單位</option>
                    <option v-for="opt in donationOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <div v-if="showErrors && !donationUnit" class="text-danger small mt-1 animate__animated animate__shakeX">
                    <i class="bi bi-exclamation-triangle-fill"></i> 請選擇捐贈單位
                  </div>
                </div>
                <div v-if="donationUnit === 'CUSTOM'" class="floating-input-wrap mt-4 animate__animated animate__fadeIn">
                  <label class="floating-label">輸入捐贈碼</label>
                  <input type="text" v-model="donationCode" class="form-control aesop-input" placeholder="例如：135, 888, 999">
                  <div v-if="showErrors && !donationCode" class="text-danger small mt-1 animate__animated animate__shakeX">
                    <i class="bi bi-exclamation-triangle-fill"></i> 請輸入捐贈碼
                  </div>
                  <div v-if="autoDonationUnit" class="mt-2 small text-success fw-bold">
                    <i class="bi bi-heart-fill me-1"></i>受贈單位：{{ autoDonationUnit }}
                  </div>
                </div>
              </div>

              <div v-if="invoiceType === 'COMPANY'" class="invoice-detail-panel p-3 rounded-3 bg-light animate__animated animate__fadeInUp">
                <div class="floating-input-wrap mt-2">
                  <label class="floating-label">輸入統一編號</label>
                  <input type="text" v-model="taxId" class="form-control aesop-input" placeholder="請輸入 8 碼統一編號" maxlength="8">
                  <div v-if="showErrors && !taxId" class="text-danger small mt-1 animate__animated animate__shakeX">
                    <i class="bi bi-exclamation-triangle-fill"></i> 請輸入 8 碼統一編號
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="checkout-section border-0">
            <div class="section-header mb-2">
              <div class="section-header-left">
                <i class="bi bi-sticky section-icon"></i>
                <span class="section-title-text">訂單備註</span>
              </div>
            </div>
            <div class="section-body">
              <textarea v-model="note" class="note-textarea" rows="2" placeholder="有什麼想告訴我們的嗎？（選填）"></textarea>
            </div>
          </section>

        </div>

        <div class="checkout-right">
          <div class="order-detail-card">
            <div class="order-detail-header">
              <h3 class="order-detail-title">
                您的訂單詳情
                <span class="item-count">({{ cart.count }}樣商品)</span>
              </h3>
              <router-link to="/cart" class="edit-cart-link">編輯購物車</router-link>
            </div>

            <div class="order-products scroll-y">
              <div v-for="item in cart.items" :key="item.id" class="order-product-item py-2 px-3">
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

    <CreditCardMock v-if="showCreditCardModal" :amount="cart.total" @close="showCreditCardModal = false"
      @payment-success="() => { showCreditCardModal = false; processOrder() }" />
  </div>
</template>

<style scoped>
/* =====================================================
   結帳頁面 — App-like 滿版不捲動佈局
   ===================================================== */
.checkout-page {
  /* 扣除 Navbar 大約高度，確保畫面不會出現全域捲動軸 */
  height: calc(100vh - 70px); 
  overflow: hidden; 
  background: #FAFBFC;
  padding: 1.5rem 1rem 2rem;
  display: flex;
  flex-direction: column;
}

.checkout-container {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  flex: 1; 
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 頁面標題 ===== */
.checkout-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--brand-dark, #1E293B);
  margin-bottom: 1.5rem;
  letter-spacing: -0.5px;
  flex-shrink: 0;
}

/* ===== 雙欄佈局 ===== */
.checkout-layout {
  display: grid;
  grid-template-columns: 1fr 462px;
  gap: 3rem;
  align-items: stretch;
  flex: 1;
  overflow: hidden; 
}

/* ===== 左側區塊：允許內部滾動 ===== */
.checkout-left {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto; 
  padding-right: 12px; 
}

.checkout-left::-webkit-scrollbar {
  width: 4px;
}
.checkout-left::-webkit-scrollbar-thumb {
  background: #E2E8F0;
  border-radius: 10px;
}

/* ===== Section 通用 ===== */
.checkout-section {
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 1.75rem;
  margin-bottom: 1.75rem;
  flex-shrink: 0;
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

/* ===== 付款方式 (2x2 Grid) ===== */
.payment-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.payment-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 0.75rem 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  min-height: 54px;
}

.payment-card:hover {
  background: #F8FAFC;
}

.payment-card.active {
  border-color: var(--brand-teal, #0D9488);
  background-color: #F0FDFA;
}

.payment-card input[type="radio"] {
  display: none;
}

.payment-card-icon-sm {
  font-size: 1.4rem;
  color: #64748B;
  transition: color 0.2s;
}

.payment-card.active .payment-card-icon-sm {
  color: var(--brand-teal, #0D9488);
}

.payment-card-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--brand-dark, #1E293B);
  white-space: nowrap;
}

.payment-label-sm {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--brand-dark, #1E293B);
}

/* ===== 支付 Logo 樣式 ===== */
.payment-logo-img {
  height: 30px; 
  width: auto;
  object-fit: contain;
}

.payment-logos {
  max-width: 75%; 
}

/* 滾動條樣式共用 */
.scroll-y {
  overflow-y: auto;
}
.scroll-y::-webkit-scrollbar {
  width: 4px;
}
.scroll-y::-webkit-scrollbar-thumb {
  background: #E2E8F0;
  border-radius: 10px;
}

/* 確保付款方式和發票資訊的圈圈都能變色 */
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

.payment-option.active .payment-radio-circle,
.payment-card.active .payment-radio-circle {
  border-color: var(--brand-teal, #0D9488);
}

.payment-radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.2s;
}

.payment-option.active .payment-radio-dot,
.payment-card.active .payment-radio-dot {
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

/* ===== Aesop 壓線標籤 (Floating Label) 樣式 ===== */
.floating-input-wrap {
  position: relative;
  margin-top: 1.25rem;
}

.floating-label {
  position: absolute;
  top: -8px; /* 往上移，恰好壓在邊框線上 */
  left: 12px;
  font-size: 0.75rem;
  color: #64748B;
  /* 這裡的背景色必須跟 .bg-light 完全相同，才能遮住底下的邊框線 */
  background-color: #f8f9fa; 
  padding: 0 6px;
  z-index: 10;
  line-height: 1;
}

.aesop-input {
  background-color: transparent !important; /* 透明背景讓它融入灰色 panel */
  border: 1px solid #CBD5E1;
  border-radius: 4px;
  color: #1E293B;
  padding: 0.6rem 0.75rem;
  transition: border-color 0.2s;
}

.aesop-input:focus {
  border-color: #1E293B; /* Focus 時變成深色邊框，更貼近 Aesop 風格 */
  box-shadow: none; /* 移除 Bootstrap 預設的光暈 */
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
.checkout-right {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.order-detail-card {
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 0.5rem;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

.order-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #F1F5F9;
  flex-shrink: 0;
}

/* 讓發票區塊的自定義 Radio 也支援 active 狀態 */
.active-border {
  border-color: var(--brand-teal, #0D9488) !important;
}
.active-dot {
  background: var(--brand-teal, #0D9488) !important;
}

.cursor-pointer { cursor: pointer; }

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
  flex: 1; 
  overflow-y: auto;
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
  flex-shrink: 0;
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

/* ===== 下單按鈕（右側卡片內） ===== */
.order-submit-wrap {
  padding: 0 1.5rem 1.5rem;
  flex-shrink: 0;
}

/* ===== RWD ===== */
@media (max-width: 900px) {
  .checkout-page {
    height: auto;
    overflow: visible;
  }
  .checkout-container, 
  .checkout-layout {
    overflow: visible;
  }
  
  .checkout-layout {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .checkout-right {
    order: -1; 
  }

  .order-detail-card {
    height: auto;
  }
  
  .order-products {
    max-height: 280px; 
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