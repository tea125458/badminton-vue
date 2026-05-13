<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const showBackToTop = ref(false)

const handleScroll = () => {
  // 當往下滾動超過 300px 時，顯示按鈕
  if (window.scrollY > 300) {
    showBackToTop.value = true
  } else {
    showBackToTop.value = false
  }
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <Transition name="fade">
    <button
      v-if="showBackToTop"
      @click="scrollToTop"
      class="btn btn-sky-blue rounded-circle shadow back-to-top-btn d-flex justify-content-center align-items-center"
      title="回到頂部"
    >
      <i class="bi bi-arrow-up text-white fs-4"></i>
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  z-index: 1050;
  border: none;
  background-color: #0ea5e9; /* 品牌主色 */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.back-to-top-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(14, 165, 233, 0.4) !important;
  background-color: #0284c7; /* 稍暗的藍色 */
}

/* Vue 轉場動畫 (淡入淡出) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
