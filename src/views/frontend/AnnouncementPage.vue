<script setup>
/**
 * 前台 — 最新公告頁面
 * 功能：分類篩選、置頂公告、手風琴展開內容、瀏覽次數 +1（前端防重複）
 */
import { ref, computed, onMounted } from 'vue'
import { announcementApi } from '@/api/announcement'

const announcements = ref([])
const selectedCategory = ref('全部')
const expandedId = ref(null)
const currentPage = ref(1)
const pageSize = 6

// 從 API 載入所有「已發佈」的公告
onMounted(async () => {
  const all = await announcementApi.findAll()
  announcements.value = all.filter((a) => a.status === 'PUBLISHED')
})

// 所有分類（動態從資料中提取）
const categories = computed(() => {
  const cats = new Set(announcements.value.map((a) => a.category).filter(Boolean))
  return ['全部', ...cats]
})

// 篩選後的公告
const filteredAnnouncements = computed(() => {
  let list = [...announcements.value]
  if (selectedCategory.value !== '全部') {
    list = list.filter((a) => a.category === selectedCategory.value)
  }
  return list.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

// 分頁後的公告
const totalPages = computed(() => Math.ceil(filteredAnnouncements.value.length / pageSize))
const paginatedAnnouncements = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredAnnouncements.value.slice(start, start + pageSize)
})

// 切換頁碼
function goToPage(page) {
  currentPage.value = page
  expandedId.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 切換分類（同時回到第 1 頁）
function selectCategory(cat) {
  selectedCategory.value = cat
  currentPage.value = 1
}

// 分類對應的顏色
function getCategoryColor(category) {
  const map = {
    活動公告: '#0EA5E9',
    場館動態: '#00B4B4',
    優惠通知: '#F59E0B',
    系統公告: '#8B5CF6',
  }
  return map[category] || '#64748B'
}

// 相對時間
function relativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  if (diffHr < 24) return `${diffHr} 小時前`
  if (diffDay < 30) return `${diffDay} 天前`
  return dateStr.slice(0, 10)
}

// 將換行轉為 <br>
function formatContent(content) {
  if (!content) return ''
  return content.replace(/\n/g, '<br>')
}

// 展開 / 收合公告（含瀏覽次數 +1，前端防重複）
async function toggleExpand(announcement) {
  if (expandedId.value === announcement.announcementId) {
    expandedId.value = null
    return
  }
  expandedId.value = announcement.announcementId

  const viewedKey = 'viewed_announcements'
  const viewed = JSON.parse(sessionStorage.getItem(viewedKey) || '[]')
  if (!viewed.includes(announcement.announcementId)) {
    try {
      const updated = await announcementApi.incrementView(announcement.announcementId)
      announcement.viewCount = updated.viewCount
      viewed.push(announcement.announcementId)
      sessionStorage.setItem(viewedKey, JSON.stringify(viewed))
    } catch (e) {
      console.error('瀏覽次數更新失敗', e)
    }
  }
}
</script>

<template>
  <div class="container py-4">
    <!-- 頁面標題橫幅 -->
    <div
      class="announcement-hero card-rounded-lg shadow-sm mb-4 p-4 p-md-5"
      style="position: relative; overflow: hidden; min-height: 220px"
    >
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="hero-icon">
          <i class="bi bi-megaphone-fill"></i>
        </div>
        <div>
          <h2 class="fw-bold mb-1 hero-title">最新公告</h2>
          <p class="mb-0 hero-subtitle">
            掌握羽過天晴的最新消息、活動資訊與優惠通知
          </p>
        </div>
      </div>
      <!-- 分類篩選標籤 -->
      <div class="d-flex flex-wrap gap-2 mt-3">
        <button
          v-for="cat in categories"
          :key="cat"
          class="btn btn-sm category-tag"
          :class="{ active: selectedCategory === cat }"
          @click="selectCategory(cat)"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- 公告列表 -->
    <div v-if="filteredAnnouncements.length > 0" class="announcement-list">
      <div
        v-for="(a, index) in paginatedAnnouncements"
        :key="a.announcementId"
        class="announcement-card card-rounded shadow-sm mb-3"
        :class="{ expanded: expandedId === a.announcementId, pinned: a.isPinned }"
        :style="{ animationDelay: `${index * 0.05}s` }"
        @click="toggleExpand(a)"
      >
        <div class="card-header-area p-4">
          <div class="d-flex align-items-start gap-3">
            <!-- 置頂圖釘 -->
            <div v-if="a.isPinned" class="pin-badge" title="置頂公告">
              <i class="bi bi-pin-fill"></i>
            </div>
            <!-- 主要內容 -->
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span
                  class="badge rounded-pill px-3 py-1"
                  :style="{
                    background: getCategoryColor(a.category),
                    color: 'white',
                    fontSize: '0.85rem',
                  }"
                >
                  {{ a.category || '一般' }}
                </span>
                <span class="text-muted" style="font-size: 0.88rem">
                  <i class="bi bi-clock me-1"></i>{{ relativeTime(a.createdAt) }}
                </span>
                <span class="text-muted" style="font-size: 0.88rem">
                  <i class="bi bi-eye me-1"></i>{{ a.viewCount || 0 }}
                </span>
              </div>
              <h4 class="fw-bold mb-1 announcement-title" style="font-size: 1.25rem">{{ a.title }}</h4>
              <p
                v-if="expandedId !== a.announcementId"
                class="text-secondary mb-0"
                style="font-size: 0.95rem; line-height: 1.7"
              >
                {{ a.content?.slice(0, 80) }}{{ a.content?.length > 80 ? '...' : '' }}
              </p>
            </div>
            <!-- 展開箭頭 -->
            <div class="expand-arrow">
              <i
                class="bi"
                :class="expandedId === a.announcementId ? 'bi-chevron-up' : 'bi-chevron-down'"
              ></i>
            </div>
          </div>
        </div>

        <!-- 展開內容 -->
        <transition name="slide-down">
          <div v-if="expandedId === a.announcementId" class="card-body-area px-4 pb-4">
            <hr class="mt-0 mb-3" style="border-color: #e2e8f0" />
            <div class="announcement-content" v-html="formatContent(a.content)"></div>
            <div
              class="d-flex align-items-center gap-3 mt-3 pt-2"
              style="border-top: 1px solid #f1f5f9"
            >
              <small class="text-muted">
                <i class="bi bi-calendar3 me-1"></i>{{ a.createdAt?.slice(0, 10) }}
              </small>
              <small class="text-muted">
                <i class="bi bi-eye me-1"></i>已瀏覽 {{ a.viewCount || 0 }} 次
              </small>
            </div>
          </div>
        </transition>
      </div>

      <!-- 分頁 -->
      <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
        <ul class="pagination-custom">
          <li>
            <button
              class="page-btn"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>
          <li v-for="page in totalPages" :key="page">
            <button
              class="page-btn"
              :class="{ active: currentPage === page }"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
          </li>
          <li>
            <button
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>

      <!-- 頁碼資訊 -->
      <p class="text-center text-muted mt-2" style="font-size: 0.88rem">
        共 {{ filteredAnnouncements.length }} 則公告，第 {{ currentPage }} / {{ totalPages }} 頁
      </p>
    </div>

    <!-- 空狀態 -->
    <div v-else class="text-center py-5">
      <i class="bi bi-inbox" style="font-size: 3rem; color: #cbd5e1"></i>
      <p class="text-muted mt-3 mb-0">目前沒有公告</p>
    </div>
  </div>
</template>

<style scoped>
.announcement-hero {
  background: linear-gradient(135deg, #f0f9ff 0%, #f0fdfa 100%);
  border: 1px solid var(--brand-border);
  position: relative;
  overflow: hidden;
}

.announcement-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: -10%;
  width: 120%;
  height: 100%;
  background: url('/images/announcement/family.jpg') center center / cover no-repeat;
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
  transform: translateX(8%);
}

.announcement-hero::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 60%;
  height: 100%;
  background: linear-gradient(to right, rgba(240, 249, 255, 0.95) 0%, rgba(240, 253, 250, 0.85) 50%, transparent 100%);
  pointer-events: none;
  z-index: 1;
}

.announcement-hero > * {
  position: relative;
  z-index: 2;
}

.hero-title {
  color: var(--brand-dark);
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.8);
}

.hero-subtitle {
  color: #475569;
  font-size: 1rem;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
}

.hero-icon {
  width: 52px;
  height: 52px;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.4rem;
  flex-shrink: 0;
}

.category-tag {
  border-radius: 2rem;
  padding: 0.35rem 1rem;
  font-size: 0.92rem;
  font-weight: 600;
  background: white;
  border: 1.5px solid #e2e8f0;
  color: #64748b;
  transition: all 0.25s ease;
}

.category-tag:hover {
  border-color: var(--brand-teal);
  color: var(--brand-teal);
  transform: translateY(-1px);
}

.category-tag.active {
  background: linear-gradient(135deg, var(--brand-teal), var(--brand-sky));
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 180, 180, 0.25);
}

.announcement-card {
  border: 1px solid var(--brand-border);
  cursor: pointer;
  transition: all 0.3s ease;
  animation: fadeInUp 0.4s ease both;
  overflow: hidden;
}

.announcement-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.announcement-card.expanded {
  border-color: var(--brand-teal);
  box-shadow: 0 8px 24px rgba(0, 180, 180, 0.1);
}

.announcement-card.pinned {
  border-left: 4px solid var(--brand-teal);
}

.pin-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.announcement-title {
  transition: color 0.2s ease;
}

.announcement-card:hover .announcement-title {
  color: var(--brand-teal);
}

.expand-arrow {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.announcement-card:hover .expand-arrow {
  background: var(--brand-teal);
  color: white;
}

.announcement-content {
  font-size: 1rem;
  line-height: 1.85;
  color: #475569;
}

.slide-down-enter-active {
  transition: all 0.3s ease;
}

.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ----- 分頁按鈕 ----- */
.pagination-custom {
  display: flex;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.page-btn {
  width: 38px;
  height: 38px;
  border-radius: 0.75rem;
  border: 1.5px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--brand-teal);
  color: var(--brand-teal);
  transform: translateY(-1px);
}

.page-btn.active {
  background: linear-gradient(135deg, var(--brand-teal), var(--brand-sky));
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 180, 180, 0.25);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
