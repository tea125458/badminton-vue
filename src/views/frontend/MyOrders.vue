<script setup>
/**
 * 當前訂單詳情頁面
 * 只顯示剛成交或特定的訂單
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi } from '@/api/order'

const route = useRoute()
const router = useRouter()
const orderId = route.query.orderId
const order = ref(null)
const items = ref([])
const loading = ref(true)

// 狀態與樣式對應
const statusMap = {
  UNPAID: { label: '訂單成立', color: '#0D9488', bg: '#F0FDFA', icon: 'bi-clipboard-check' },
  PAID: { label: '備貨中', color: '#3B82F6', bg: '#DBEAFE', icon: 'bi-box-seam' },
  SHIPPED: { label: '待取貨', color: '#8B5CF6', bg: '#EDE9FE', icon: 'bi-shop' },
  COMPLETED: { label: '已完成', color: '#10B981', bg: '#D1FAE5', icon: 'bi-check2-circle' },
  CANCELLED: { label: '已取消', color: '#F43F5E', bg: '#FFE4E6', icon: 'bi-x-circle' },
}

const paymentMap = {
  CASH: '現場現金支付', CREDIT_CARD: '信用卡', TRANSFER: '銀行轉帳', LINE_PAY: 'LINE Pay',
}

// 模擬發票號碼生成 (根據訂單 ID)
const mockInvoiceNumber = computed(() => {
  if (!orderId) return ''
  return 'XY-' + String(orderId).padStart(8, '0')
})

onMounted(async () => {
  if (!orderId) {
    // 如果沒有 ID，導向個人中心查看歷史
    router.replace('/profile?tab=orders')
    return
  }

  try {
    const data = await orderApi.findById(orderId)
    order.value = data
    items.value = await orderApi.findItems(orderId)
  } catch (e) {
    console.error('載入訂單失敗', e)
  } finally {
    loading.value = false
  }
})

function formatPrice(val) {
  return val != null ? `NT$ ${Number(val).toLocaleString()}` : 'NT$ 0'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function getInvoiceTypeText(order) {
  if (!order || !order.invoiceType) return '尚未設定'
  
  if (order.invoiceType === 'INDIVIDUAL') {
    if (!order.invoiceCarrier) return '個人電子發票 (會員載具)'
    if (order.invoiceCarrier.startsWith('/')) {
      return `個人電子發票 (手機條碼：${order.invoiceCarrier})`
    }
    if (/^[A-Z]{2}\d{14}$/.test(order.invoiceCarrier)) {
      return `個人電子發票 (自然人憑證：${order.invoiceCarrier})`
    }
    return `個人電子發票 (載具：${order.invoiceCarrier})`
  }
  
  if (order.invoiceType === 'DONATION') {
    return `捐贈發票 (捐贈碼：${order.invoiceCarrier || '未提供'})`
  }
  
  if (order.invoiceType === 'COMPANY') {
    return `公司發票 (統編：${order.invoiceTaxId || '未提供'})`
  }
  
  return '尚未設定'
}
</script>

<template>
  <div class="my-orders-page py-5">
    <div class="container" style="max-width: 850px;">
      
      <!-- 頁面標題 -->
      <div class="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 class="fw-800 mb-1" style="color: var(--brand-dark);">訂單詳情</h2>
          <p class="text-secondary small mb-0">感謝您的購買，以下為您的訂單完整資訊</p>
        </div>
        <router-link to="/profile" class="btn btn-outline-secondary btn-sm rounded-pill px-3">
          查看歷史訂單 <i class="bi bi-arrow-right"></i>
        </router-link>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-teal" role="status"></div>
      </div>

      <div v-else-if="order" class="order-detail-wrapper animate__animated animate__fadeIn">
        <div class="row g-4">
          <!-- 左側：訂單核心資訊 -->
          <div class="col-md-7">
            
            <!-- 狀態卡片 -->
            <div class="detail-card mb-4 status-highlight" :style="{ backgroundColor: statusMap[order.status].bg }">
              <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-3">
                  <div class="status-icon-box" :style="{ backgroundColor: statusMap[order.status].color }">
                    <i :class="['bi', statusMap[order.status].icon]"></i>
                  </div>
                  <div>
                    <div class="small text-secondary fw-bold">訂單狀態</div>
                    <div class="fw-800" :style="{ color: statusMap[order.status].color, fontSize: '1.25rem' }">
                      {{ statusMap[order.status].label }}
                    </div>
                  </div>
                </div>
                <div class="text-end">
                  <div class="small text-secondary">訂單編號</div>
                  <div class="fw-bold">#{{ order.orderId }}</div>
                </div>
              </div>
            </div>

            <!-- 取貨與付款資訊 -->
            <div class="detail-card mb-4">
              <h6 class="card-subtitle mb-3"><i class="bi bi-geo-alt-fill me-2"></i>取貨資訊</h6>
              <div class="info-group mb-3">
                <div class="info-label">取貨方式</div>
                <div class="info-value">球館自取 (羽過天晴羽球館)</div>
                <div class="info-desc">請於打球時間至櫃檯出示訂單編號即可取貨</div>
              </div>
              <hr class="my-3 opacity-10">
              <h6 class="card-subtitle mb-3"><i class="bi bi-wallet2 me-2"></i>付款資訊</h6>
              <div class="row">
                <div class="col-6">
                  <div class="info-label">付款方式</div>
                  <div class="info-value">{{ paymentMap[order.paymentType] }}</div>
                </div>
                <div class="col-6 text-end">
                  <div class="info-label">訂單日期</div>
                  <div class="info-value small">{{ formatDate(order.orderDate) }}</div>
                </div>
              </div>
            </div>

            <!-- 發票資訊 (Mock) -->
            <div class="detail-card">
              <h6 class="card-subtitle mb-3"><i class="bi bi-receipt me-2"></i>發票資訊</h6>
              <div class="row g-3">
                <div class="col-6">
                  <div class="info-label">發票號碼</div>
                  <div class="info-value text-teal fw-bold">{{ mockInvoiceNumber }}</div>
                </div>
                <div class="col-6 text-end">
                  <div class="info-label">發票形式</div>
                  <div class="info-value">{{ getInvoiceTypeText(order) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右側：商品清單摘要 -->
          <div class="col-md-5">
            <div class="detail-card h-100 shadow-sm border-0">
              <h6 class="card-subtitle mb-3">商品明細 ({{ items.length }}樣)</h6>
              <div class="product-list-mini mb-4">
                <div v-for="item in items" :key="item.itemId" class="product-item-row">
                  <img :src="'http://localhost:8080' + item.product.imageUrl" class="prod-img" v-if="item.product.imageUrl">
                  <div class="prod-info">
                    <div class="prod-name">{{ item.product.productName }}</div>
                    <div class="prod-qty">數量：{{ item.quantity }}</div>
                  </div>
                  <div class="prod-price">{{ formatPrice(item.subtotal) }}</div>
                </div>
              </div>
              
              <div class="price-summary pt-3 border-top">
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-secondary">小計</span>
                  <span>{{ formatPrice(order.totalAmount) }}</span>
                </div>
                <div class="d-flex justify-content-between mb-3">
                  <span class="text-secondary">運費 (自取)</span>
                  <span class="text-success fw-bold">免運費</span>
                </div>
                <div class="d-flex justify-content-between align-items-center total-row pt-2">
                  <span class="fw-bold">總計</span>
                  <span class="total-amount">{{ formatPrice(order.totalAmount) }}</span>
                </div>
              </div>

              <!-- 備註 -->
              <div v-if="order.note" class="mt-4 p-3 rounded-3 bg-light">
                <div class="info-label mb-1"><i class="bi bi-sticky me-1"></i>訂單備註</div>
                <div class="small text-dark">{{ order.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else class="text-center py-5">
        <i class="bi bi-exclamation-circle display-1 text-light mb-3 d-block"></i>
        <h4>找不到訂單資訊</h4>
        <router-link to="/products" class="btn btn-brand mt-3">回到商城</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-orders-page {
  background: #FAFBFC;
  min-height: 90vh;
}

.fw-800 { font-weight: 800; }
.text-teal { color: var(--brand-teal); }

.detail-card {
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.status-highlight {
  border: none;
}

.status-icon-box {
  width: 50px;
  height: 50px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.card-subtitle {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--brand-dark);
  letter-spacing: 0.5px;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--brand-dark);
}

.info-desc {
  font-size: 0.8rem;
  color: #64748B;
  margin-top: 2px;
}

.product-list-mini {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.product-item-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.prod-img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 0.5rem;
  background: #f8fafc;
}

.prod-info { flex: 1; }
.prod-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--brand-dark);
  line-height: 1.2;
}

.prod-qty {
  font-size: 0.75rem;
  color: #94A3B8;
}

.prod-price {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--brand-dark);
}

.total-amount {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--brand-teal);
}

.total-row {
  border-top: 2px dashed #E2E8F0;
}
</style>
