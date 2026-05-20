<script setup>
/**
 * 當前訂單詳情頁面
 * 只顯示剛成交或特定的訂單
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
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
  CASH: '現金支付', CREDIT_CARD: '信用卡', TRANSFER: '銀行轉帳', LINE_PAY: 'LINE Pay',
}

// 模擬發票號碼生成 (根據訂單 ID)
const mockInvoiceNumber = computed(() => {
  if (!orderId) return ''
  return 'XY-' + String(orderId).padStart(8, '0')
})

let pollingTimer = null

onMounted(async () => {
  if (!orderId) {
    // 如果沒有 ID，導向個人中心查看歷史
    router.replace('/profile?tab=orders')
    return
  }

  const loadData = async () => {
    try {
      const data = await orderApi.findById(orderId)
      order.value = data
      items.value = await orderApi.findItems(orderId)
    } catch (e) {
      console.error('載入訂單失敗', e)
    } finally {
      loading.value = false
    }
  }

  await loadData()

  // 啟用短輪詢 (Short Polling)，每 5 秒自動去後端抓取最新狀態
  pollingTimer = setInterval(() => {
    loadData()
  }, 5000)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
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

function getDonationUnit(code) {
  if (!code) return ''
  const unitMap = {
    '919': '財團法人創世社會福利基金會',
    '25885': '財團法人伊甸社會福利基金會',
    '13579': '財團法人陽光社會福利基金會',
    '5678': '財團法人台灣兒童暨家庭扶助基金會',
    '520': '財團法人罕見疾病基金會',
    '135': '財團法人董氏基金會',
    '001': '財團法人羅慧夫顱顏基金會',
    '888': '財團法人台灣癌症基金會',
    '999': '財團法人喜憨兒社會福利基金會',
    '111': '財團法人弘道老人福利基金會'
  }
  return unitMap[code] || ''
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
    const code = order.invoiceCarrier || ''
    const unitMap = {
      '919': '財團法人創世社會福利基金會',
      '25885': '財團法人伊甸社會福利基金會',
      '13579': '財團法人陽光社會福利基金會',
      '5678': '財團法人台灣兒童暨家庭扶助基金會',
      '520': '財團法人罕見疾病基金會',
      '135': '財團法人董氏基金會',
      '001': '財團法人羅慧夫顱顏基金會',
      '888': '財團法人台灣癌症基金會',
      '999': '財團法人喜憨兒社會福利基金會',
      '111': '財團法人弘道老人福利基金會'
    }
    if (unitMap[code]) {
      return `捐贈發票 (${unitMap[code]}，捐贈碼：${code})`
    }
    return `捐贈發票 (捐贈碼：${code || '未提供'})`
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
          <h2 class="fw-800 mb-1" style="color: var(--brand-dark);">我的訂單</h2>
          <p class="text-secondary small mb-0">感謝您的購買，以下為您的訂單完整資訊</p>
        </div>
        <router-link to="/profile?tab=orders" class="btn btn-outline-secondary btn-sm rounded-pill px-3">
          會員中心 <i class="bi bi-arrow-right"></i>
        </router-link>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-teal" role="status"></div>
      </div>

      <!-- 🎉 成功慶祝橫幅 (僅在剛下單 UNPAID 或 PAID 狀態下顯示) -->
      <div v-if="!loading && order && (order.status === 'UNPAID' || order.status === 'PAID')" class="success-banner mb-4 animate__animated animate__fadeInDown">
        <div class="success-banner-inner d-flex align-items-center gap-4">
          <div class="success-icon-wrap">
            <div class="success-icon-ring">
              <i class="bi bi-check-lg"></i>
            </div>
          </div>
          <div class="flex-grow-1">
            <div class="success-title">🎉 感謝您的購買！</div>
            <div class="success-subtitle">
              您的訂單 <strong>#{{ order.orderId }}</strong> 已成功建立，我們將盡快為您進行理貨。<br>
              請前往 <router-link to="/profile?tab=orders" class="success-link">「會員中心」</router-link> 隨時追蹤最新的訂單進度。
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && order" class="order-detail-wrapper animate__animated animate__fadeIn">
        <div class="row g-4">
          <!-- 左側：訂單核心資訊 -->
          <div class="col-md-7">
            
            <!-- 狀態卡片 (僅在非新訂單狀態如已出貨、已完成、已取消時顯示) -->
            <div v-if="order.status !== 'UNPAID' && order.status !== 'PAID'" class="detail-card mb-4 status-highlight" :style="{ backgroundColor: statusMap[order.status].bg }">
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
                  <div class="info-value text-end">
                    <template v-if="order.invoiceType === 'INDIVIDUAL'">
                      <div>個人電子發票</div>
                      <div class="info-sub-value text-muted" v-if="order.invoiceCarrier">
                        <span v-if="order.invoiceCarrier.startsWith('/')">（手機條碼：{{ order.invoiceCarrier }}）</span>
                        <span v-else-if="/^[A-Z]{2}\d{14}$/.test(order.invoiceCarrier)">（自然人憑證：{{ order.invoiceCarrier }}）</span>
                        <span v-else>（載具：{{ order.invoiceCarrier }}）</span>
                      </div>
                      <div class="info-sub-value text-end fw-bold" v-else style="color: #ea580c !important; font-size: 0.75rem;">
                        （現場取貨時隨貨交付）
                      </div>
                    </template>
                    <template v-else-if="order.invoiceType === 'DONATION'">
                      <div>捐贈發票</div>
                      <div class="info-sub-value text-muted">
                        <template v-if="getDonationUnit(order.invoiceCarrier)">
                          <div>{{ getDonationUnit(order.invoiceCarrier) }}</div>
                          <div>(捐贈碼：{{ order.invoiceCarrier }})</div>
                        </template>
                        <template v-else>
                          <div>(捐贈碼：{{ order.invoiceCarrier || '未提供' }})</div>
                        </template>
                      </div>
                    </template>
                    <template v-else-if="order.invoiceType === 'COMPANY'">
                      <div>公司發票</div>
                      <div class="info-sub-value text-muted text-end" v-if="order.invoiceTaxId">
                        （統編：{{ order.invoiceTaxId }}）
                      </div>
                      <div class="info-sub-value text-muted text-end" v-else>
                        （未提供統編）
                      </div>
                    </template>
                    <template v-else>
                      尚未設定
                    </template>
                  </div>
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

      <!-- 🚀 行動呼籲按鈕區 -->
      <div v-if="!loading && order" class="cta-section mt-5 animate__animated animate__fadeInUp">
        <div class="cta-divider mb-4">
          <span class="cta-divider-text">接下來，您可以...</span>
        </div>
        <div class="row g-3 justify-content-center">
          <div class="col-sm-4">
            <router-link to="/products" class="cta-btn cta-btn-shop">
              <i class="bi bi-bag-heart-fill cta-btn-icon"></i>
              <div class="cta-btn-label">繼續逛逛商城</div>
              <div class="cta-btn-desc">探索更多羽球好物</div>
            </router-link>
          </div>
          <div class="col-sm-4">
            <router-link to="/profile?tab=orders" class="cta-btn cta-btn-orders">
              <i class="bi bi-person-lines-fill cta-btn-icon"></i>
              <div class="cta-btn-label">前往會員中心</div>
              <div class="cta-btn-desc">查看完整訂單進度</div>
            </router-link>
          </div>
          <div class="col-sm-4">
            <router-link to="/booking" class="cta-btn cta-btn-court">
              <i class="bi bi-calendar-check-fill cta-btn-icon"></i>
              <div class="cta-btn-label">去預約球場</div>
              <div class="cta-btn-desc">開心打球，享受運動</div>
            </router-link>
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
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 0.75rem;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  /* 強制瀏覽器使用高對比優化渲染，消除縮小產生的模糊感 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  /* 啟用 GPU 硬體加速，提升縮放時的細節清晰度 */
  transform: translateZ(0);
  backface-visibility: hidden;
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

/* ===== 成功橫幅 ===== */
.success-banner {
  background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
  border: 1.5px solid #5eead4;
  border-radius: 1.25rem;
  padding: 1.5rem 2rem;
}

.success-icon-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #0d9488;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.75rem;
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes popIn {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.success-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f766e;
  margin-bottom: 0.35rem;
}

.success-subtitle {
  font-size: 0.88rem;
  color: #0d9488;
  line-height: 1.6;
}

/* ===== CTA 按鈕區 ===== */
.cta-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.cta-divider::before,
.cta-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.cta-divider-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: #94a3b8;
  white-space: nowrap;
}

.cta-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem 1rem;
  border-radius: 1.25rem;
  border: 1.5px solid #e2e8f0;
  background: white;
  color: var(--brand-dark);
  text-decoration: none;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.cta-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.08);
  border-color: transparent;
  color: white;
}

.cta-btn-shop:hover { background: linear-gradient(135deg, #0d9488, #0891b2); }
.cta-btn-orders:hover { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.cta-btn-court:hover { background: linear-gradient(135deg, #f59e0b, #ef4444); }

.cta-btn-icon {
  font-size: 2rem;
  margin-bottom: 0.6rem;
  color: #0d9488;
  transition: color 0.25s;
}

.cta-btn:hover .cta-btn-icon { color: white; }

.cta-btn-label {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}

.cta-btn-desc {
  font-size: 0.78rem;
  opacity: 0.7;
}

/* ===== 發票子資訊雙行效果 ===== */
.info-sub-value {
  font-size: 0.78rem;
  font-weight: 500;
  color: #64748B !important;
  margin-top: 3px;
  line-height: 1.3;
}

/* ===== 慶祝橫幅會員中心連結樣式 ===== */
.success-link {
  color: #0f766e !important;
  font-weight: 800;
  text-decoration: underline !important;
  transition: opacity 0.2s;
  display: inline-block;
}

.success-link:hover {
  opacity: 0.8;
}
</style>
