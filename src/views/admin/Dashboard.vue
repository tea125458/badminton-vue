<script setup>
/**
 * 數據儀表板 — 後台總覽統計
 * 顯示：會員數、今日預約、訂單數、揪團數 + 近期動態
 */
import { ref, onMounted } from 'vue'

// TODO: 之後串接真實 API
const loading = ref(true)

// 統計卡片數據
const stats = ref([
  {
    title: '總會員數',
    value: '1,286',
    change: '+12%',
    changeType: 'up',
    icon: 'bi-people-fill',
    color: '#0EA5E9',
    bg: '#F0F9FF',
  },
  {
    title: '今日預約',
    value: '34',
    change: '+5',
    changeType: 'up',
    icon: 'bi-calendar-check-fill',
    color: '#00B4B4',
    bg: '#F0FDFA',
  },
  {
    title: '本月訂單',
    value: '182',
    change: '+8.3%',
    changeType: 'up',
    icon: 'bi-receipt',
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    title: '進行中揪團',
    value: '15',
    change: '-2',
    changeType: 'down',
    icon: 'bi-person-arms-up',
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
])

// 近期動態
const recentActivities = ref([
  { icon: 'bi-person-plus', color: '#0EA5E9', bg: '#F0F9FF', text: '新會員「林小明」完成註冊', time: '5 分鐘前' },
  { icon: 'bi-calendar-check', color: '#00B4B4', bg: '#F0FDFA', text: '陳大文 預約了 A 館 Court 3（18:00-20:00）', time: '12 分鐘前' },
  { icon: 'bi-cart-check', color: '#F59E0B', bg: '#FFFBEB', text: '訂單 #20240525-003 已出貨', time: '30 分鐘前' },
  { icon: 'bi-people', color: '#8B5CF6', bg: '#F5F3FF', text: '「週末友誼賽」揪團已額滿（8/8）', time: '1 小時前' },
  { icon: 'bi-megaphone', color: '#EF4444', bg: '#FEF2F2', text: '公告「夏季聯賽報名」已發布', time: '2 小時前' },
  { icon: 'bi-person-plus', color: '#0EA5E9', bg: '#F0F9FF', text: '新會員「王美美」完成註冊', time: '3 小時前' },
])

// 熱門場館排行
const topVenues = ref([
  { rank: 1, name: '羽過天晴 A 館', bookings: 156, rate: 92 },
  { rank: 2, name: '羽過天晴 C 館', bookings: 134, rate: 88 },
  { rank: 3, name: '羽過天晴 B 館', bookings: 98, rate: 76 },
])

// 模擬載入
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 500)
})
</script>

<template>
  <div>
    <!-- 頁面標題 -->
    <div class="mb-4">
      <h2 style="margin: 0; font-size: 1.6rem; font-weight: 700; color: #1e293b;">
        <i class="bi bi-bar-chart-line" style="margin-right: 0.4rem;"></i>數據儀表板
      </h2>
      <p class="text-secondary mb-0" style="font-size: 0.85rem;">
        系統運營數據總覽，資料每 5 分鐘自動更新
      </p>
    </div>

    <!-- 統計卡片 -->
    <div class="row g-4 mb-4">
      <div v-for="stat in stats" :key="stat.title" class="col-sm-6 col-xl-3">
        <div class="card card-rounded shadow-sm border-0 h-100">
          <div class="card-body p-4">
            <div class="d-flex align-items-start justify-content-between mb-3">
              <div
                class="d-flex align-items-center justify-content-center rounded-3"
                :style="{ width: '48px', height: '48px', backgroundColor: stat.bg, color: stat.color }"
              >
                <i :class="['bi', stat.icon]" style="font-size: 1.25rem;"></i>
              </div>
              <span
                class="badge rounded-pill d-flex align-items-center gap-1"
                :class="stat.changeType === 'up' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'"
                style="font-size: 0.7rem; font-weight: 600;"
              >
                <i :class="stat.changeType === 'up' ? 'bi bi-arrow-up-short' : 'bi bi-arrow-down-short'"></i>
                {{ stat.change }}
              </span>
            </div>
            <div class="fw-bold mb-1" style="font-size: 1.75rem; color: var(--brand-dark);">{{ stat.value }}</div>
            <div class="text-secondary" style="font-size: 0.8rem;">{{ stat.title }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <!-- 左欄：近期動態 -->
      <div class="col-lg-8">
        <div class="card card-rounded shadow-sm border-0">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-4 d-flex align-items-center gap-2">
              <span style="width: 4px; height: 1.25rem; background: var(--brand-sky); border-radius: 2px; display: inline-block;"></span>
              近期動態
            </h5>

            <div class="d-flex flex-column gap-3">
              <div
                v-for="(activity, index) in recentActivities"
                :key="index"
                class="d-flex align-items-center gap-3 p-3 rounded-3"
                style="background: #FAFBFC; transition: background 0.2s;"
                @mouseenter="$event.currentTarget.style.background = '#F0F9FF'"
                @mouseleave="$event.currentTarget.style.background = '#FAFBFC'"
              >
                <div
                  class="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                  :style="{ width: '40px', height: '40px', backgroundColor: activity.bg, color: activity.color }"
                >
                  <i :class="['bi', activity.icon]"></i>
                </div>
                <div class="flex-1">
                  <div class="fw-semibold" style="font-size: 0.875rem;">{{ activity.text }}</div>
                </div>
                <div class="text-secondary flex-shrink-0" style="font-size: 0.75rem;">{{ activity.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右欄：熱門場館排行 -->
      <div class="col-lg-4">
        <div class="card card-rounded shadow-sm border-0">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-4 d-flex align-items-center gap-2">
              <span style="width: 4px; height: 1.25rem; background: var(--brand-teal); border-radius: 2px; display: inline-block;"></span>
              熱門場館排行
            </h5>

            <div class="d-flex flex-column gap-4">
              <div v-for="venue in topVenues" :key="venue.rank" class="d-flex align-items-center gap-3">
                <!-- 排名 -->
                <div
                  class="d-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0"
                  :style="{
                    width: '32px', height: '32px', fontSize: '0.8rem',
                    background: venue.rank === 1 ? 'linear-gradient(135deg, #F59E0B, #EAB308)' : venue.rank === 2 ? 'linear-gradient(135deg, #94A3B8, #CBD5E1)' : 'linear-gradient(135deg, #D97706, #B45309)',
                    color: 'white'
                  }"
                >
                  {{ venue.rank }}
                </div>

                <!-- 資訊 -->
                <div class="flex-1">
                  <div class="fw-bold" style="font-size: 0.875rem;">{{ venue.name }}</div>
                  <div class="text-secondary" style="font-size: 0.75rem;">
                    {{ venue.bookings }} 筆預約
                  </div>
                </div>

                <!-- 使用率 -->
                <div class="text-end">
                  <div class="fw-bold" style="font-size: 0.9rem; color: var(--brand-teal);">{{ venue.rate }}%</div>
                  <div class="progress mt-1" style="width: 60px; height: 4px;">
                    <div
                      class="progress-bar"
                      :style="{ width: venue.rate + '%', backgroundColor: 'var(--brand-teal)' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 快速統計 -->
        <div class="card card-gradient shadow-sm mt-4 p-4">
          <div class="position-relative" style="z-index: 2;">
            <h6 class="fw-bold mb-2">
              <i class="bi bi-lightning-fill me-1"></i>本週快報
            </h6>
            <div class="d-flex flex-column gap-2 mt-3" style="font-size: 0.85rem;">
              <div class="d-flex justify-content-between">
                <span style="color: rgba(255,255,255,0.7);">新增會員</span>
                <span class="fw-bold">+23 人</span>
              </div>
              <div class="d-flex justify-content-between">
                <span style="color: rgba(255,255,255,0.7);">場地使用率</span>
                <span class="fw-bold">87%</span>
              </div>
              <div class="d-flex justify-content-between">
                <span style="color: rgba(255,255,255,0.7);">營收總額</span>
                <span class="fw-bold">NT$ 128,500</span>
              </div>
            </div>
          </div>
          <i class="bi bi-graph-up-arrow card-gradient-icon"></i>
        </div>
      </div>
    </div>
  </div>
</template>
