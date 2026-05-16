<script setup>
/**
 * 首頁 — 場館環境介紹
 * 左側：自動輪播 3 間場館實景照（每 5 秒切換）
 * 右側：4 個設施特色
 */
import { ref, onMounted, onUnmounted } from 'vue'

const features = [
  {
    icon: 'bi-trophy',
    title: '專業比賽場地',
    desc: '國際標準的 PU 地板，提供最佳打球體驗',
  },
  {
    icon: 'bi-snow2',
    title: '全場冷氣開放',
    desc: '恆溫空調系統，夏天也能舒適暢打',
  },
  {
    icon: 'bi-p-circle',
    title: '免費停車場',
    desc: '地下停車場提供 50 個免費車位',
  },
  {
    icon: 'bi-droplet',
    title: '淋浴更衣室',
    desc: '獨立淋浴間與置物櫃，打完球清爽回家',
  },
]

const slides = [
  { src: 'http://localhost:8080/images/venues/venue-a-env.png', label: '羽過天晴 A館' },
  { src: 'http://localhost:8080/images/venues/venue-b-env.png', label: '羽過天晴 B館' },
  { src: 'http://localhost:8080/images/venues/venue-c-env.png', label: '羽過天晴 C館' },
]

const currentSlide = ref(0)
let timer = null

function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % slides.length
}

function goToSlide(index) {
  currentSlide.value = index
  resetTimer()
}

function resetTimer() {
  clearInterval(timer)
  timer = setInterval(nextSlide, 5000)
}

onMounted(() => {
  timer = setInterval(nextSlide, 5000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <section class="mb-5">
    <h2 class="section-title">場館環境</h2>

    <div class="row g-4 align-items-center">
      <!-- 左側：輪播 -->
      <div class="col-lg-6">
        <div class="venue-carousel card-rounded-lg shadow-sm overflow-hidden">
          <!-- 圖片容器 -->
          <div class="carousel-track">
            <div
              v-for="(slide, i) in slides"
              :key="i"
              class="carousel-slide"
              :class="{ active: i === currentSlide }"
            >
              <img :src="slide.src" :alt="slide.label" />
            </div>
          </div>

          <!-- 場館名稱標籤 -->
          <div class="carousel-label">
            <i class="bi bi-geo-alt-fill me-1"></i>{{ slides[currentSlide].label }}
          </div>

          <!-- 指示點 -->
          <div class="carousel-dots">
            <button
              v-for="(slide, i) in slides"
              :key="i"
              class="dot"
              :class="{ active: i === currentSlide }"
              @click="goToSlide(i)"
              :aria-label="slide.label"
            ></button>
          </div>

          <!-- 左右箭頭 -->
          <button class="carousel-arrow carousel-arrow--prev" @click="goToSlide((currentSlide - 1 + slides.length) % slides.length)">
            <i class="bi bi-chevron-left"></i>
          </button>
          <button class="carousel-arrow carousel-arrow--next" @click="goToSlide((currentSlide + 1) % slides.length)">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- 右側：設施特色 -->
      <div class="col-lg-6">
        <div class="row g-3">
          <div v-for="feature in features" :key="feature.title" class="col-6">
            <div class="card card-rounded shadow-sm border-0 p-4 h-100 hover-lift text-center">
              <div class="quick-action-icon mx-auto mb-3">
                <i :class="['bi', feature.icon]" style="font-size: 1.6rem;"></i>
              </div>
              <h6 class="fw-bold mb-2" style="font-size: 1.05rem;">{{ feature.title }}</h6>
              <p class="text-secondary mb-0" style="font-size: 0.88rem; line-height: 1.5;">{{ feature.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 輪播容器 */
.venue-carousel {
  position: relative;
  height: 400px;
  background: #0f172a;
}

/* 圖片層疊 */
.carousel-track {
  position: relative;
  width: 100%;
  height: 100%;
}

.carousel-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.8s ease;
}

.carousel-slide.active {
  opacity: 1;
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 場館名稱標籤 */
.carousel-label {
  position: absolute;
  bottom: 3rem;
  left: 1.25rem;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: white;
  padding: 0.45rem 1rem;
  border-radius: 2rem;
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  transition: opacity 0.3s ease;
}

/* 指示點 */
.carousel-dots {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: all 0.3s ease;
}

.dot.active {
  background: white;
  border-color: white;
  transform: scale(1.2);
}

.dot:hover:not(.active) {
  background: rgba(255, 255, 255, 0.4);
}

/* 左右箭頭 */
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: white;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s ease;
}

.venue-carousel:hover .carousel-arrow {
  opacity: 1;
}

.carousel-arrow:hover {
  background: rgba(255, 255, 255, 0.35);
}

.carousel-arrow--prev { left: 0.75rem; }
.carousel-arrow--next { right: 0.75rem; }
</style>
