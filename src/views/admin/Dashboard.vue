<script setup>
/**
 * 儀表板 — 連線測試版
 * 用來驗證 Vue ↔ Spring Boot ↔ 資料庫 是否串通
 */
import { ref, onMounted } from 'vue'
import { venueApi } from '@/api/venue'
import { productApi } from '@/api/product'

// 測試結果
const venueResult = ref({ status: '⏳ 等待測試...', data: null })
const productResult = ref({ status: '⏳ 等待測試...', data: null })
const loading = ref(false)

// 頁面載入時自動執行測試
onMounted(() => {
  runTests()
})

async function runTests() {
  loading.value = true

  // 測試 1：呼叫場館 API
  try {
    const venues = await venueApi.findAll()
    venueResult.value = {
      status: '✅ 成功！',
      data: venues,
    }
  } catch (err) {
    venueResult.value = {
      status: '❌ 失敗',
      data: err.message,
    }
  }

  // 測試 2：呼叫商品 API
  try {
    const products = await productApi.findAll()
    productResult.value = {
      status: '✅ 成功！',
      data: products,
    }
  } catch (err) {
    productResult.value = {
      status: '❌ 失敗',
      data: err.message,
    }
  }

  loading.value = false
}
</script>

<template>
  <div>
    <h2>📊 儀表板 — 連線測試</h2>
    <p style="color: #888; margin-bottom: 20px">
      此頁面會自動呼叫後端 API，驗證 Vue → Vite Proxy → Spring Boot → 資料庫 是否串通
    </p>

    <button @click="runTests" :disabled="loading" style="margin-bottom: 20px; padding: 8px 20px">
      {{ loading ? '測試中...' : '🔄 重新測試' }}
    </button>

    <!-- 測試 1：場館 -->
    <div style="border: 1px solid #ddd; padding: 16px; margin-bottom: 16px; border-radius: 8px">
      <h3>測試 1：GET /api/venues</h3>
      <p><strong>狀態：</strong>{{ venueResult.status }}</p>
      <p v-if="venueResult.data && Array.isArray(venueResult.data)">
        <strong>取得 {{ venueResult.data.length }} 筆場館資料</strong>
      </p>
      <pre v-if="venueResult.data" style="background: #f8f8f8; padding: 12px; overflow: auto; max-height: 200px">{{
        JSON.stringify(venueResult.data, null, 2)
      }}</pre>
    </div>

    <!-- 測試 2：商品 -->
    <div style="border: 1px solid #ddd; padding: 16px; margin-bottom: 16px; border-radius: 8px">
      <h3>測試 2：GET /api/products</h3>
      <p><strong>狀態：</strong>{{ productResult.status }}</p>
      <p v-if="productResult.data && Array.isArray(productResult.data)">
        <strong>取得 {{ productResult.data.length }} 筆商品資料</strong>
      </p>
      <pre v-if="productResult.data" style="background: #f8f8f8; padding: 12px; overflow: auto; max-height: 200px">{{
        JSON.stringify(productResult.data, null, 2)
      }}</pre>
    </div>
  </div>
</template>
