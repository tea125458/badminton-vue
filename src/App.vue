<script setup>
/**
 * 根元件
 * 只放 <RouterView />，讓 Layout 元件決定版面
 */
</script>

<template>
  <RouterView />
</template>

<style>
/* 全域基礎樣式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft JhengHei', 'Segoe UI', sans-serif;
  color: #333;
  background-color: #f5f5f5;
}
</style>
