<script setup>
/**
 * 首頁 — 最新公告輪播 + 場館營業資訊
 * 左側 col-lg-7：Bootstrap Carousel 輪播公告（從 API 抓取）
 * 右側 col-lg-5：場館營業資訊卡片
 */
import { ref, onMounted } from 'vue'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const announcements = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await axios.get(`${API}/api/announcements`)
    // 只取已發布的公告，最新 5 筆
    const published = (data.data || data)
      .filter(a => a.status === 'PUBLISHED')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
    announcements.value = published
  } catch (e) {
    console.error('Failed to load announcements:', e)
    // fallback 靜態資料
    announcements.value = [
      { announcementId: 1, category: '活動公告', title: '夏季羽球聯賽報名正式開始', content: '獎金金額達五萬元，趕快邀請球友一起參加！', createdAt: '2026-05-10' },
      { announcementId: 2, category: '場館動態', title: '場館照明升級工程完工', content: '全面換裝 LED 專業照明，提供更好的比賽環境。', createdAt: '2026-05-08' },
    ]
  } finally {
    loading.value = false
  }
})

// 根據 category 選擇 badge 顏色
function badgeClass(category) {
  if (category === '緊急') return 'badge-urgent'
  if (category === '活動') return 'badge-event'
  return 'badge-general'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// 截取前 60 字
function excerpt(text) {
  if (!text) return ''
  return text.length > 60 ? text.substring(0, 60) + '…' : text
}
</script>

<template>
  <section class="mb-5">
    <h2 class="section-title"><i class="bi bi-megaphone me-2"></i>最新公告與場館資訊</h2>

    <div class="row align-items-stretch news-venue-row">
      <!-- 左側：公告輪播 -->
      <div class="col-lg-7">
        <div
          id="announcementCarousel"
          class="carousel slide card-rounded-lg shadow-sm overflow-hidden h-100"
          data-bs-ride="carousel"
          data-bs-interval="5000"
        >
          <!-- 載入中 -->
          <div v-if="loading" class="d-flex align-items-center justify-content-center bg-dark h-100" style="min-height: 460px;">
            <div class="spinner-border text-light" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>

          <template v-else-if="announcements.length">
            <div class="carousel-indicators">
              <button
                v-for="(item, index) in announcements"
                :key="item.announcementId"
                type="button"
                data-bs-target="#announcementCarousel"
                :data-bs-slide-to="index"
                :class="{ active: index === 0 }"
                :aria-label="`Slide ${index + 1}`"
              ></button>
            </div>

            <div class="carousel-inner">
              <div
                v-for="(item, index) in announcements"
                :key="item.announcementId"
                class="carousel-item"
                :class="{ active: index === 0 }"
              >
                <div class="carousel-card position-relative">
                  <!-- 漸層背景替代圖片 -->
                  <div class="carousel-bg" :class="`carousel-bg-${index % 3}`"></div>
                  <!-- 文字覆蓋 -->
                  <div class="carousel-text-overlay">
                    <span class="badge mb-2" :class="badgeClass(item.category)">
                      {{ item.category || '一般' }}
                    </span>
                    <h5 class="text-white fw-bold mb-2">{{ item.title }}</h5>
                    <p class="text-white-50 mb-2" style="font-size: 0.85rem; line-height: 1.6;">
                      {{ excerpt(item.content) }}
                    </p>
                    <small class="text-white-50">{{ formatDate(item.createdAt) }}</small>
                  </div>
                </div>
              </div>
            </div>

            <button class="carousel-control-prev" type="button" data-bs-target="#announcementCarousel" data-bs-slide="prev">
              <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#announcementCarousel" data-bs-slide="next">
              <span class="carousel-control-next-icon" aria-hidden="true"></span>
            </button>
          </template>

          <!-- 無公告 -->
          <div v-else class="d-flex align-items-center justify-content-center bg-dark text-white-50" style="height: 380px;">
            <p class="mb-0">目前沒有公告</p>
          </div>
        </div>
      </div>

      <!-- 右側：場館營業資訊 -->
      <div class="col-lg-5">
        <div class="venue-info-card card-rounded-lg shadow-sm overflow-hidden h-100">
          <div class="venue-info-header">
            <i class="bi bi-building me-2"></i>場館營業資訊
          </div>
          <div class="venue-info-body">
            <!-- 營業時間 -->
            <div class="info-row">
              <div class="info-icon-wrap">
                <i class="bi bi-clock"></i>
              </div>
              <div>
                <div class="info-label">營業時間</div>
                <div class="info-value">
                  每日營業 <strong>10:00 - 22:00</strong>（含假日）
                </div>
              </div>
            </div>

            <!-- 場地費用 -->
            <div class="info-row">
              <div class="info-icon-wrap icon-green">
                <i class="bi bi-cash-coin"></i>
              </div>
              <div>
                <div class="info-label">場地費用</div>
                <div class="info-value">
                  每場每小時 <strong class="text-price">$300</strong>
                </div>
              </div>
            </div>

            <!-- 付款方式 -->
            <div class="info-row">
              <div class="info-icon-wrap icon-purple">
                <i class="bi bi-credit-card"></i>
              </div>
              <div>
                <div class="info-label">付款方式</div>
                <div class="info-value">
                  <span class="pay-tag">現金</span>
                  <span class="pay-tag">信用卡</span>
                  <span class="pay-tag">LINE Pay</span>
                </div>
              </div>
            </div>

            <!-- 服務據點 -->
            <div class="info-row border-0">
              <div class="info-icon-wrap icon-amber">
                <i class="bi bi-geo-alt"></i>
              </div>
              <div>
                <div class="info-label">服務據點</div>
                <div class="info-value">
                  <strong>3</strong> 館 ・ <strong>15</strong> 場地
                  <div class="text-muted mt-1" style="font-size: 0.78rem;">
                    A館（大安）/ B館（信義）/ C館（中山）
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ===== 兩卡間距 ===== */
.news-venue-row {
  --bs-gutter-x: 3.5rem;
  --bs-gutter-y: 2rem;
}

/* ===== 公告輪播卡片 ===== */
.carousel-card {
  height: 100%;
  min-height: 480px;
  position: relative;
  overflow: hidden;
}

.carousel-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: transform 0.6s ease;
}

.carousel-item:hover .carousel-bg {
  transform: scale(1.05);
}

.carousel-bg-0 {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0ea5e9 100%);
}
.carousel-bg-1 {
  background: linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #14b8a6 100%);
}
.carousel-bg-2 {
  background: linear-gradient(135deg, #0f172a 0%, #4a1942 50%, #8b5cf6 100%);
}

.carousel-text-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2rem;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
  z-index: 1;
}

/* Badge 顏色 */
.badge-urgent { background: #EF4444; color: white; }
.badge-event  { background: #0EA5E9; color: white; }
.badge-general { background: rgba(255,255,255,0.2); color: white; backdrop-filter: blur(4px); }

/* ===== 場館資訊卡片 ===== */
.venue-info-card {
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.venue-info-header {
  background: linear-gradient(135deg, var(--brand-teal-dark, #0d9488), var(--brand-teal, #14b8a6));
  color: white;
  font-weight: 700;
  font-size: 1.3rem;
  padding: 1.3rem 1.8rem;
  letter-spacing: 0.03em;
}

.venue-info-body {
  padding: 1rem 1.8rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
  padding: 1.15rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.info-icon-wrap {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 0.85rem;
  background: #F0F9FF;
  color: #0EA5E9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

.info-icon-wrap.icon-green {
  background: #F0FDF4;
  color: #16a34a;
}
.info-icon-wrap.icon-purple {
  background: #FAF5FF;
  color: #8b5cf6;
}
.info-icon-wrap.icon-amber {
  background: #FFFBEB;
  color: #d97706;
}

.info-label {
  font-size: 0.88rem;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.3rem;
}

.info-value {
  font-size: 1.05rem;
  color: #334155;
  line-height: 1.7;
}

.text-price {
  color: #16a34a;
  font-size: 1.5rem;
}

.pay-tag {
  display: inline-block;
  background: #f1f5f9;
  color: #475569;
  padding: 0.35rem 0.85rem;
  border-radius: 2rem;
  font-size: 0.95rem;
  margin-right: 0.5rem;
  margin-top: 0.35rem;
  font-weight: 500;
}

/* ===== 響應式 ===== */
@media (max-width: 991.98px) {
  .carousel-card {
    min-height: 340px;
  }
}
</style>
