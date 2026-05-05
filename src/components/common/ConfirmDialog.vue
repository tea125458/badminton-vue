<script setup>
/**
 * 確認對話框元件
 *
 * 使用方式：
 * <ConfirmDialog
 *   :visible="showDialog"
 *   title="確認刪除"
 *   message="確定要刪除這筆資料嗎？此操作無法復原。"
 *   @confirm="handleDelete"
 *   @cancel="showDialog = false"
 * />
 */

defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '確認操作' },
  message: { type: String, default: '確定要執行此操作嗎？' },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="visible" class="dialog-overlay" @click.self="emit('cancel')">
    <div class="dialog-box">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="dialog-actions">
        <button class="btn-cancel" @click="emit('cancel')">取消</button>
        <button class="btn-confirm" @click="emit('confirm')">確認</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-box {
  background: white;
  border-radius: 8px;
  padding: 24px;
  min-width: 360px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dialog-box h3 {
  margin: 0 0 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel {
  padding: 8px 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.btn-confirm {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  background-color: #e74c3c;
  color: white;
  cursor: pointer;
}
</style>
