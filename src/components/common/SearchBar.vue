<script setup>
/**
 * 通用搜尋列元件
 *
 * 使用方式：
 * <SearchBar v-model="keyword" placeholder="搜尋會員..." @search="handleSearch" />
 */

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜尋...' },
})

const emit = defineEmits(['update:modelValue', 'search'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

function onSearch() {
  emit('search', props.modelValue)
}
</script>

<template>
  <div class="search-bar">
    <input
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
      @keyup.enter="onSearch"
    />
    <button @click="onSearch">搜尋</button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-bar input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.search-bar button {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  background-color: #3498db;
  color: white;
  cursor: pointer;
}
</style>
