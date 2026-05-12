<script setup>
/**
 * 結帳頁面
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { orderApi } from '@/api/order'

const router = useRouter()
const cart = useCartStore()
const isSubmitting = ref(false)

// 表單資料
const paymentType = ref('CASH')
const note = ref('')

// 付款方式選項（對應後端 PaymentType Enum）
const paymentOptions = [
  { value: 'CASH',        label: '現場現金支付', icon: 'bi-cash-stack',  desc: '打球時至櫃檯付款' },
  { value: 'CREDIT_CARD', label: '信用卡',       icon: 'bi-credit-card', desc: '支援 VISA / MasterCard' },
  { value: 'TRANSFER',    label: '銀行轉帳',     icon: 'bi-bank',        desc: '下單後請於 24 小時內完成匯款' },
  { value: 'LINE_PAY',    label: 'LINE Pay',     icon: 'bi-chat-fill',   desc: '使用 LINE Pay 行動支付' },
]

onMounted(() => {
  if (cart.isEmpty) {
    alert('購物車是空的，請先加入商品！')
    router.push('/products')
  }
})

// 送出訂單
async function handleSubmit() {
  if (isSubmitting.value) return
  if (cart.isEmpty) return

  // TODO: 登入機制完成後，改為從 authStore 取得 memberId
  // 目前先用 memberId = 1（王小明）做 Demo
  const memberId = 1

  isSubmitting.value = true
  try {
    // Step 1: 建立訂單主檔
    const newOrder = await orderApi.create({
      member: { memberId: memberId },
      totalAmount: cart.cartTotal,
      paymentType: paymentType.value,
      note: note.value || null,
    })

    // Step 2: 逐筆建立訂單明細（後端會自動扣庫存 + 計算 subtotal）
    for (const item of cart.items) {
      await orderApi.createItem(newOrder.orderId, {
        product: { productId: item.productId },
        quantity: item.quantity,
        unitPrice: item.price,
      })
    }

    // Step 3: 清空購物車 → 跳轉成功頁
    cart.clearCart()
    router.push({
      path: '/order-success',
      query: { orderId: newOrder.orderId }
    })

  } catch (e) {
    console.error('訂單建立失敗', e)
    alert('訂單建立失敗：' + (e.response?.data?.message || e.message))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="container py-5" style="max-width: 1000px;">
    <h2 class="section-title">
      <i class="bi bi-credit-card-2-front" style="color: var(--brand-teal);"></i>
      確認結帳
    </h2>

    <div class="row g-4">
      <!-- 左側：付款資訊 -->
      <div class="col-lg-7">
        <!-- 取貨提示 -->
        <div class="card card-rounded shadow-sm border-0 mb-4">
          <div class="card-body p-4">
            <div class="pickup-notice">
              <div class="pickup-icon">
                <i class="bi bi-geo-alt-fill"></i>
              </div>
              <div>
                <div class="fw-bold" style="color: var(--brand-dark); font-size: 0.95rem;">
                  球館自取
                </div>
                <div class="text-secondary" style="font-size: 0.82rem;">
                  訂單成立後，請於打球時間至球館櫃檯領取商品
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 付款方式 -->
        <div class="card card-rounded shadow-sm border-0 mb-4">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-3" style="font-size: 1rem; color: var(--brand-dark);">
              <i class="bi bi-wallet2 me-2" style="color: var(--brand-sky);"></i>付款方式
            </h5>
            <div class="payment-grid">
              <label
                v-for="opt in paymentOptions" :key="opt.value"
                class="payment-card"
                :class="{ active: paymentType === opt.value }"
              >
                <input type="radio" v-model="paymentType" :value="opt.value" class="d-none" />
                <div class="d-flex align-items-center gap-3">
                  <div class="payment-icon" :class="{ active: paymentType === opt.value }">
                    <i :class="['bi', opt.icon]"></i>
                  </div>
                  <div>
                    <div class="fw-bold" style="font-size: 0.9rem;">{{ opt.label }}</div>
                    <div class="text-secondary" style="font-size: 0.72rem;">{{ opt.desc }}</div>
                  </div>
                </div>
                <i v-if="paymentType === opt.value" class="bi bi-check-circle-fill"
                   style="color: var(--brand-teal); font-size: 1.1rem;"></i>
              </label>
            </div>
          </div>
        </div>

        <!-- 備註 -->
        <div class="card card-rounded shadow-sm border-0">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-3" style="font-size: 1rem; color: var(--brand-dark);">
              <i class="bi bi-sticky me-2" style="color: var(--brand-sky);"></i>訂單備註
            </h5>
            <textarea
              v-model="note"
              class="form-control"
              rows="3"
              placeholder="有什麼想告訴我們的嗎？（選填）"
              style="border-radius: 0.75rem; border-color: #E2E8F0;"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- 右側：訂單摘要 -->
      <div class="col-lg-5">
        <div class="card card-rounded shadow-sm border-0 sticky-top" style="top: 20px;">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-3" style="font-size: 1rem; color: var(--brand-dark);">
              <i class="bi bi-receipt me-2" style="color: var(--brand-sky);"></i>訂單摘要
            </h5>

            <!-- 商品列表 -->
            <div class="summary-items mb-3">
              <div v-for="item in cart.items" :key="item.productId" class="summary-item">
                <div class="d-flex align-items-center gap-3">
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl.startsWith('/') || item.imageUrl.startsWith('http') ? item.imageUrl : '/' + item.imageUrl"
                    class="rounded-3 border"
                    style="width: 48px; height: 48px; object-fit: cover;"
                  />
                  <div v-else class="rounded-3 d-flex align-items-center justify-content-center"
                       style="width: 48px; height: 48px; background: #F1F5F9;">
                    <i class="bi bi-box-seam" style="color: #CBD5E1;"></i>
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="fw-semibold line-clamp-1" style="font-size: 0.85rem;">{{ item.productName }}</div>
                    <div class="text-secondary" style="font-size: 0.72rem;">
                      NT$ {{ item.price.toLocaleString() }} × {{ item.quantity }}
                    </div>
                  </div>
                  <div class="fw-bold" style="color: var(--brand-teal); font-size: 0.9rem; white-space: nowrap;">
                    NT$ {{ (item.price * item.quantity).toLocaleString() }}
                  </div>
                </div>
              </div>
            </div>

            <hr style="border-color: #E2E8F0;" />

            <!-- 金額明細 -->
            <div class="d-flex justify-content-between mb-2" style="font-size: 0.9rem;">
              <span class="text-secondary">商品小計</span>
              <span>NT$ {{ cart.cartTotal.toLocaleString() }}</span>
            </div>
            <div class="d-flex justify-content-between mb-3" style="font-size: 0.9rem;">
              <span class="text-secondary">運費（球館自取）</span>
              <span class="fw-semibold" style="color: var(--brand-teal);">免運</span>
            </div>

            <hr style="border-color: #E2E8F0;" />

            <div class="d-flex justify-content-between align-items-end mb-4 mt-3">
              <span class="fw-bold" style="font-size: 1.05rem; color: var(--brand-dark);">應付總額</span>
              <span class="fw-bold" style="font-size: 1.5rem; color: var(--brand-teal);">
                NT$ {{ cart.cartTotal.toLocaleString() }}
              </span>
            </div>

            <!-- 下單按鈕 -->
            <button
              @click="handleSubmit"
              class="btn btn-brand w-100 py-3"
              :disabled="isSubmitting || cart.isEmpty"
              style="font-size: 1.05rem;"
            >
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-bag-check me-2"></i>
              {{ isSubmitting ? '訂單處理中...' : '確認下單' }}
            </button>

            <div class="text-center mt-3">
              <router-link to="/cart" class="text-secondary" style="font-size: 0.8rem; text-decoration: none;">
                <i class="bi bi-arrow-left me-1"></i>返回購物車
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 取貨提示 ===== */
.pickup-notice {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #F0FDFA, #F0F9FF);
  border-radius: 0.75rem;
  border: 1px solid #CCFBF1;
}
.pickup-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--brand-teal);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

/* ===== 付款方式 ===== */
.payment-grid {
  display: grid;
  gap: 0.75rem;
}
.payment-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border: 2px solid #F1F5F9;
  border-radius: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.payment-card:hover {
  border-color: #BAE6FD;
  background: #FAFBFC;
}
.payment-card.active {
  border-color: var(--brand-teal);
  background: #F0FDFA;
}
.payment-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F1F5F9;
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.payment-icon.active {
  background: var(--brand-teal);
  color: white;
}

/* ===== 訂單摘要 ===== */
.summary-items { max-height: 280px; overflow-y: auto; }
.summary-item {
  padding: 0.65rem 0;
  border-bottom: 1px solid #F1F5F9;
}
.summary-item:last-child { border-bottom: none; }
.min-w-0 { min-width: 0; }
</style>
