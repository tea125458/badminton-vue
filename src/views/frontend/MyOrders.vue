<script setup>
/**
 * 會員訂單查詢頁面（前台）
 *
 * 功能：
 * 1. 依會員 ID 取得該會員的所有訂單
 * 2. 點擊展開查看訂單明細
 * 3. 顯示訂單狀態進度條
 *
 * TODO: 登入機制完成後，memberId 改為從 authStore 取得
 */
import { ref, onMounted } from 'vue'
import { orderApi } from '@/api/order'

const orders = ref([])
const loading = ref(true)
const expandedId = ref(null)
const orderItems = ref({}) // { orderId: [items...] }
const loadingItems = ref(null) // 正在載入明細的 orderId

// TODO: 登入機制完成後改為動態取得
const memberId = 1

// 狀態對照
const statusMap = {
  UNPAID: { label: '訂單成立', color: '#F59E0B', bg: '#FEF3C7', icon: 'bi-clipboard-check' },
  PAID: { label: '備貨中', color: '#3B82F6', bg: '#DBEAFE', icon: 'bi-box-seam' },
  SHIPPED: { label: '待取貨', color: '#8B5CF6', bg: '#EDE9FE', icon: 'bi-shop' },
  COMPLETED: { label: '已取貨', color: '#10B981', bg: '#D1FAE5', icon: 'bi-check2-circle' },
  CANCELLED: { label: '已取消', color: '#F43F5E', bg: '#FFE4E6', icon: 'bi-x-circle' },
}

const paymentMap = {
  CASH: '現金', CREDIT_CARD: '信用卡', TRANSFER: '轉帳', LINE_PAY: 'LINE Pay',
}

// 進度條
const progressSteps = ['UNPAID', 'PAID', 'SHIPPED', 'COMPLETED']
function isStepActive(currentStatus, step) {
  if (currentStatus === 'CANCELLED') return false
  return progressSteps.indexOf(step) <= progressSteps.indexOf(currentStatus)
}
function getProgressWidth(currentStatus) {
  if (currentStatus === 'CANCELLED') return '0%'
  const index = progressSteps.indexOf(currentStatus)
  if (index === -1) return '0%'
  return (index / (progressSteps.length - 1)) * 100 + '%'
}

onMounted(async () => {
  try {
    orders.value = await orderApi.findByMemberId(memberId)
    // 按日期新 → 舊排序
    orders.value.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
  } catch (e) {
    console.error('載入訂單失敗', e)
  } finally {
    loading.value = false
  }
})

async function toggleExpand(orderId) {
  if (expandedId.value === orderId) {
    expandedId.value = null
    return
  }
  expandedId.value = orderId

  // 若尚未載入過明細，就呼叫 API
  if (!orderItems.value[orderId]) {
    loadingItems.value = orderId
    try {
      orderItems.value[orderId] = await orderApi.findItems(orderId)
    } catch (e) {
      console.error('載入明細失敗', e)
      orderItems.value[orderId] = []
    } finally {
      loadingItems.value = null
    }
  }
}

function formatPrice(val) {
  return val != null ? `NT$ ${Number(val).toLocaleString()}` : 'NT$ 0'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-TW') + ' ' + d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="container py-5" style="max-width: 800px;">
    <h2 class="section-title">
      <i class="bi bi-receipt-cutoff" style="color: var(--brand-teal);"></i>
      我的訂單
    </h2>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" style="color: var(--brand-sky);" role="status"></div>
      <p class="text-secondary mt-2">載入訂單中...</p>
    </div>

    <!-- 無訂單 -->
    <div v-else-if="orders.length === 0" class="card card-rounded shadow-sm border-0 text-center py-5">
      <div class="card-body">
        <i class="bi bi-receipt" style="font-size: 4rem; color: #CBD5E1;"></i>
        <h5 class="fw-bold mt-3" style="color: var(--brand-dark);">還沒有訂單</h5>
        <p class="text-secondary mb-4">快去商城逛逛，選購你需要的羽球用品吧！</p>
        <router-link to="/products" class="btn btn-brand">
          <i class="bi bi-shop me-2"></i>前往商城
        </router-link>
      </div>
    </div>

    <!-- 訂單列表 -->
    <div v-else class="d-flex flex-column gap-3">
      <div v-for="order in orders" :key="order.orderId" class="card card-rounded shadow-sm border-0 order-card">
        <!-- 訂單標題列 -->
        <div class="card-body p-4 pb-3" style="cursor: pointer;" @click="toggleExpand(order.orderId)">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <span class="fw-bold" style="color: var(--brand-dark); font-size: 1.05rem;">
                訂單 #{{ order.orderId }}
              </span>
              <span class="ms-2 text-secondary" style="font-size: 0.8rem;">
                {{ formatDate(order.orderDate) }}
              </span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="order-status-badge"
                :style="{ backgroundColor: statusMap[order.status]?.bg, color: statusMap[order.status]?.color }">
                <i :class="['bi', statusMap[order.status]?.icon]" class="me-1"></i>
                {{ statusMap[order.status]?.label }}
              </span>
              <i class="bi" :class="expandedId === order.orderId ? 'bi-chevron-up' : 'bi-chevron-down'"
                style="color: #94A3B8; font-size: 0.85rem;"></i>
            </div>
          </div>

          <!-- 金額 + 付款方式 -->
          <div class="d-flex justify-content-between align-items-center">
            <span class="text-secondary" style="font-size: 0.8rem;">
              <i class="bi bi-credit-card me-1"></i>{{ paymentMap[order.paymentType] || '未設定' }}
            </span>
            <span class="fw-bold" style="color: var(--brand-teal); font-size: 1.15rem;">
              {{ formatPrice(order.totalAmount) }}
            </span>
          </div>
        </div>

        <!-- 展開的明細區 -->
        <transition name="expand">
          <div v-if="expandedId === order.orderId" class="expand-panel">
            <!-- 進度條 -->
            <div class="px-4 pt-3 pb-2">
              <div class="progress-tracker-mini">
                <div class="progress-lines-wrap">
                  <div class="progress-line-bg"></div>
                  <div class="progress-line-fill"
                    :style="{ width: getProgressWidth(order.status), backgroundColor: 'var(--brand-sky)' }">
                  </div>
                </div>
                <div v-for="step in progressSteps" :key="step" class="progress-step-mini"
                  :class="{ active: isStepActive(order.status, step), current: order.status === step }">
                  <div class="step-dot"
                    :style="isStepActive(order.status, step) ? { borderColor: 'var(--brand-sky)', backgroundColor: order.status === step ? 'white' : 'var(--brand-sky)' } : {}">
                    <div v-if="order.status === step" class="step-dot-inner"
                      style="background-color: var(--brand-sky);"></div>
                  </div>
                  <div class="step-text"
                    :style="order.status === step ? { color: 'var(--brand-sky)', fontWeight: '700' } : {}">
                    {{ statusMap[step]?.label }}
                  </div>
                </div>
              </div>
              <div v-if="order.status === 'CANCELLED'" class="text-center text-danger fw-bold mt-2"
                style="font-size: 0.8rem;">
                <i class="bi bi-x-circle me-1"></i>此訂單已取消
              </div>
            </div>

            <hr class="mx-4 my-0" style="border-color: #F1F5F9;" />

            <!-- 明細列表 -->
            <div class="px-4 py-3">
              <div v-if="loadingItems === order.orderId" class="text-center py-3">
                <div class="spinner-border spinner-border-sm" style="color: var(--brand-sky);"></div>
              </div>
              <div v-else-if="orderItems[order.orderId]?.length > 0">
                <div v-for="item in orderItems[order.orderId]" :key="item.itemId" class="detail-item">
                  <div class="d-flex align-items-center gap-3">
                    <img v-if="item.product?.imageUrl"
                      :src="item.product.imageUrl.startsWith('/') || item.product.imageUrl.startsWith('http') ? item.product.imageUrl : '/' + item.product.imageUrl"
                      class="rounded-3" style="width: 64px; height: 64px; object-fit: cover; border: 1px solid #E2E8F0; flex-shrink: 0;" />
                    <div v-else class="rounded-3 d-flex align-items-center justify-content-center"
                      style="width: 64px; height: 64px; background: #F1F5F9; flex-shrink: 0;">
                      <i class="bi bi-box-seam" style="color: #CBD5E1; font-size: 1.3rem;"></i>
                    </div>
                    <div class="flex-grow-1">
                      <div class="fw-semibold" style="font-size: 0.88rem; color: var(--brand-dark); line-height: 1.4;">{{ item.product?.productName || '未知商品' }}
                      </div>
                      <div class="text-secondary mt-1" style="font-size: 0.75rem;">
                        單價 {{ formatPrice(item.unitPrice) }} × {{ item.quantity }} 件
                      </div>
                    </div>
                    <div class="fw-bold" style="color: var(--brand-teal); font-size: 0.95rem; white-space: nowrap;">
                      {{ formatPrice(item.subtotal) }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-secondary py-2" style="font-size: 0.85rem;">
                尚無明細
              </div>
            </div>

            <!-- 備註 -->
            <div v-if="order.note" class="px-4 pb-3">
              <div class="note-box">
                <i class="bi bi-sticky me-1" style="color: #F59E0B;"></i>{{ order.note }}
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 訂單卡片 ===== */
.order-card {
  transition: box-shadow 0.2s ease;
}

.order-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* ===== 狀態 Badge ===== */
.order-status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.28rem 0.7rem;
  border-radius: 9999px;
}

/* ===== 展開面板 ===== */
.expand-panel {
  border-top: 1px solid #F1F5F9;
  background: #FAFBFC;
  border-radius: 0 0 var(--brand-card-radius) var(--brand-card-radius);
}

.expand-enter-active {
  transition: all 0.3s ease;
}

.expand-leave-active {
  transition: all 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}

/* ===== 進度條 (Mini) ===== */
.progress-tracker-mini {
  position: relative;
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  overflow: hidden;
}

.progress-lines-wrap {
  position: absolute;
  top: calc(0.5rem + 6px);
  left: calc(1rem + 12.5%);
  right: calc(1rem + 12.5%);
  height: 3px;
  z-index: 1;
}

.progress-line-bg {
  width: 100%;
  height: 100%;
  background: #E2E8F0;
  border-radius: 2px;
}

.progress-line-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  z-index: 2;
  transition: width 0.4s ease;
  border-radius: 2px;
}

.progress-step-mini {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25%;
}

.step-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  border: 3px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.35rem;
  transition: all 0.3s ease;
}

.progress-step-mini.active .step-dot {
  border-color: var(--brand-sky);
  background: var(--brand-sky);
}

.progress-step-mini.current .step-dot {
  border-color: var(--brand-sky);
  background: white;
}

.step-dot-inner {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.step-text {
  font-size: 0.65rem;
  color: #94A3B8;
  font-weight: 600;
}

/* ===== 明細列 ===== */
.detail-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #F1F5F9;
}

.detail-item:last-child {
  border-bottom: none;
}

/* ===== 備註 ===== */
.note-box {
  padding: 0.6rem 0.85rem;
  background: #FFFBEB;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  color: #92400E;
}
</style>
