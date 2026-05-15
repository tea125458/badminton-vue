<script setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * 要搜尋的地址或場館名稱
   */
  address: {
    type: String,
    required: true
  },
  /**
   * 地圖區塊的高度 (例如 '350px', '100%')
   */
  height: {
    type: String,
    default: '350px'
  }
})

// 真實地圖網址計算邏輯
const googleMapUrl = computed(() => {
  if (!props.address) return ''
  return `https://maps.google.com/maps?q=${encodeURIComponent(props.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
})
</script>

<template>
  <div class="rounded-4 overflow-hidden position-relative map-container shadow-sm border mt-3" :style="{ height: height, backgroundColor: '#f8f9fa' }">
    <div v-if="!googleMapUrl" class="position-absolute top-50 start-50 translate-middle text-center">
      <div class="spinner-border text-sky-blue mb-2" role="status"></div>
      <div class="fw-bold text-secondary">載入地圖中...</div>
    </div>
    <iframe
      v-else
      width="100%"
      height="100%"
      style="border:0; position: absolute; top: 0; left: 0;"
      loading="lazy"
      allowfullscreen
      :src="googleMapUrl">
    </iframe>
  </div>
</template>

<style scoped>
.text-sky-blue { color: #0ea5e9 !important; }
</style>
