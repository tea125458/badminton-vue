<script setup>
/**
 * 訂單建立成功頁面
 *
 * 功能：
 * 1. 顯示成功提示與訂單編號
 * 2. 提示使用者「球館自取」
 * 3. 提供「查看訂單」和「繼續逛」的導航按鈕
 */
import { useRoute } from 'vue-router'

const route = useRoute()
const orderId = route.query.orderId || '—'
</script>

<template>
  <div class="container py-5 d-flex justify-content-center">
    <div class="card card-rounded shadow-sm border-0 text-center" style="max-width: 520px; width: 100%;">
      <div class="card-body p-5">

        <!-- 成功動畫 icon -->
        <div class="success-circle mb-4">
          <i class="bi bi-check-lg"></i>
        </div>

        <h3 class="fw-bold mb-2" style="color: var(--brand-dark);">訂單建立成功！</h3>
        <p class="text-secondary mb-4" style="font-size: 0.9rem;">
          感謝您的訂購，我們已收到您的訂單。
        </p>

        <!-- 訂單編號 -->
        <div class="order-id-card mb-4">
          <div class="text-secondary" style="font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em;">訂單編號</div>
          <div class="fw-bold" style="font-size: 1.5rem; color: var(--brand-teal);">#{{ orderId }}</div>
        </div>

        <!-- 取貨提示 -->
        <div class="pickup-reminder mb-4">
          <i class="bi bi-geo-alt me-2" style="color: var(--brand-teal);"></i>
          請於打球時間至<strong>球館櫃檯</strong>領取商品
        </div>

        <!-- 操作按鈕 -->
        <div class="d-grid gap-2">
          <router-link :to="{ path: '/my-orders', query: { orderId: orderId } }" class="btn btn-brand py-3">
            <i class="bi bi-receipt me-2"></i>查看我的訂單
          </router-link>
          <router-link to="/products" class="btn btn-brand-outline py-3">
            <i class="bi bi-shop me-2"></i>繼續逛商城
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 成功圓圈動畫 ===== */
.success-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-teal), var(--brand-sky));
  color: white;
  font-size: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

/* ===== 訂單編號卡 ===== */
.order-id-card {
  padding: 1rem;
  background: #F8FAFC;
  border-radius: 0.75rem;
  border: 1px solid #F1F5F9;
}

/* ===== 取貨提示 ===== */
.pickup-reminder {
  padding: 0.85rem 1rem;
  background: #F0FDFA;
  border: 1px solid #CCFBF1;
  border-radius: 0.75rem;
  font-size: 0.85rem;
  color: #0D9488;
}
</style>
