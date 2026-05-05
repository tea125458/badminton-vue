<script setup>
/**
 * 狀態標籤元件
 *
 * 使用方式：
 * <StatusBadge status="ACTIVE" />
 * <StatusBadge status="INACTIVE" />
 */

const props = defineProps({
  status: { type: String, required: true },
})

// 狀態對應的顏色
const colorMap = {
  ACTIVE: '#27ae60',
  INACTIVE: '#e74c3c',
  CONFIRMED: '#2980b9',
  CANCELLED: '#e74c3c',
  COMPLETED: '#27ae60',
  PENDING: '#f39c12',
  UNPAID: '#e67e22',
  PAID: '#27ae60',
  SHIPPED: '#2980b9',
  OPEN: '#27ae60',
  CLOSED: '#95a5a6',
  FULL: '#e74c3c',
  DRAFT: '#95a5a6',
  PUBLISHED: '#27ae60',
  JOINED: '#2980b9',
}
</script>

<template>
  <span
    class="status-badge"
    :style="{ backgroundColor: colorMap[status] || '#95a5a6' }"
  >
    {{ status }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
}
</style>
