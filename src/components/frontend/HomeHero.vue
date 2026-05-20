<script setup>
/**
 * 首頁 Hero Banner（100vh 滿版設計）
 * 風格參考：國泰世華官網 — 全螢幕視覺衝擊
 * smash2.jpg 全幅背景 + 暗色漸層遮罩 + 大字標題 + CTA
 * 底部帶有向下滾動提示動畫
 */
const bgImg = '/images/index/HeroPicSunset4.png'

function scrollToContent() {
  const hero = document.querySelector('.hero-section')
  if (hero) {
    window.scrollTo({
      top: hero.offsetHeight - 64, // 減去 navbar 高度
      behavior: 'smooth',
    })
  }
}
</script>

<template>
  <section class="hero-section">
    <!-- 背景圖 -->
    <img :src="bgImg" alt="羽球殺球" class="hero-bg" />

    <!-- 文字內容 -->
    <div class="hero-content">
      <h1 class="hero-heading">揮灑汗水，<span class="hero-accent">羽</span>你同樂</h1>

      <p class="hero-subtitle">
        專業場地、優質設備、熱情球友，讓每一次揮拍都成為美好回憶。<br />
        立即預約場地，開始你的羽球之旅！
      </p>

      <div class="hero-stats">
        <div class="stat-item">
          <span class="stat-number">3</span>
          <span class="stat-label">專業球館</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">15</span>
          <span class="stat-label">標準場地</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">50+</span>
          <span class="stat-label">活躍球友</span>
        </div>
      </div>

      <div class="hero-actions">
        <RouterLink to="/booking" class="btn-hero-primary">
          <i class="bi bi-calendar-check me-2"></i>立即預約
        </RouterLink>
        <RouterLink to="/products" class="btn-hero-secondary">
          <i class="bi bi-shop me-2"></i>瀏覽商城
        </RouterLink>
      </div>
    </div>

    <!-- 底部滾動提示 -->
    <button class="scroll-hint" @click="scrollToContent" aria-label="向下滾動">
      <span class="scroll-text">探索更多</span>
      <span class="scroll-arrow">
        <i class="bi bi-chevron-double-down"></i>
      </span>
    </button>
  </section>
</template>

<style scoped>
/* ===== 全螢幕 Hero ===== */
.hero-section {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 600px;
  overflow: hidden;
  background-color: #0a0a0a;
  border-radius: 0;
}

/* 背景圖 */
.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 25%;
  transition: transform 8s ease;
  animation: heroZoom 20s ease-in-out infinite alternate;
}

@keyframes heroZoom {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.08);
  }
}

/* ===== 左側漸層遮罩 ===== */
.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  /* 多層漸層疊加：深邃藍黑 → 透明，營造電影感 */
  background:
    /* 左側主遮罩：從深色到透明 */
    linear-gradient(
      to right,
      rgba(8, 20, 36, 0.68) 0%,
      rgba(10, 25, 47, 0.55) 18%,
      rgba(12, 30, 55, 0.38) 35%,
      rgba(15, 38, 65, 0.18) 52%,
      rgba(20, 45, 75, 0.05) 68%,
      transparent 82%
    ),
    /* 底部微暗，讓滾動提示更清晰 */
    linear-gradient(to top, rgba(5, 12, 24, 0.35) 0%, rgba(5, 12, 24, 0.1) 12%, transparent 30%),
    /* 頂部微暗，與 navbar 銜接 */
    linear-gradient(to bottom, rgba(5, 12, 24, 0.25) 0%, transparent 15%);
  pointer-events: none;
}

/* 微噪點紋理增加質感 */
.hero-section::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
  pointer-events: none;
}

/* ===== 文字內容 ===== */
.hero-content {
  position: relative;
  z-index: 2;
  padding: 0 5rem 0 10%;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  max-width: 60%;
  animation: fadeInUp 1s ease 0.3s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 品牌標籤 */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.45rem 1.1rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1.8rem;
  width: fit-content;
  letter-spacing: 0.05em;
}

/* 標題 */
.hero-heading {
  font-size: 4.5rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: #ffffff;
  margin-bottom: 1.5rem;
}

.hero-accent {
  background: linear-gradient(135deg, #5eead4, #38bdf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 副標 */
.hero-subtitle {
  color: rgba(255, 255, 255, 0.75);
  line-height: 2;
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

/* 數據統計 */
.hero-stats {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2.5rem;
  animation: fadeInUp 1s ease 0.6s both;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #5eead4, #38bdf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.stat-label {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
}

/* CTA 按鈕 */
.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  animation: fadeInUp 1s ease 0.9s both;
}

.btn-hero-primary {
  display: inline-flex;
  align-items: center;
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  background: linear-gradient(135deg, #5eead4, #38bdf8);
  border: none;
  border-radius: 0.85rem;
  text-decoration: none;
  letter-spacing: 0.03em;
  transition: all 0.3s ease;
  box-shadow: 0 4px 24px rgba(94, 234, 212, 0.3);
}

.btn-hero-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(94, 234, 212, 0.45);
  color: #0f172a;
}

.btn-hero-secondary {
  display: inline-flex;
  align-items: center;
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.85rem;
  text-decoration: none;
  letter-spacing: 0.03em;
  transition: all 0.3s ease;
}

.btn-hero-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
  transform: translateY(-3px);
  color: white;
}

/* ===== 右下角人物插圖 ===== */
.hero-characters {
  position: absolute;
  right: 2%;
  bottom: 0;
  z-index: 2;
  width: 38%;
  max-width: 580px;
  height: auto;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.4));
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  animation: slideInRight 1.2s ease 0.5s both;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(60px) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

/* ===== 底部滾動提示 ===== */
.scroll-hint {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: color 0.3s ease;
  animation: fadeInUp 1s ease 1.2s both;
}

.scroll-hint:hover {
  color: rgba(255, 255, 255, 0.9);
}

.scroll-text {
  font-size: 0.78rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.scroll-arrow {
  animation: bounce 2s ease-in-out infinite;
  font-size: 1.1rem;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(8px);
  }
}

/* ===== 響應式 ===== */
@media (max-width: 991.98px) {
  .hero-content {
    padding: 0 2.5rem 0 5%;
    max-width: 65%;
  }

  .hero-heading {
    font-size: 2.8rem;
  }

  .hero-subtitle {
    font-size: 1.05rem;
  }

  .stat-number {
    font-size: 1.6rem;
  }

  .hero-stats {
    gap: 1.5rem;
  }

  .hero-characters {
    width: 38%;
    bottom: 3rem;
    right: 1%;
  }
}

@media (max-width: 767.98px) {
  .hero-characters {
    width: 50%;
    bottom: 1rem;
    right: 0;
    opacity: 0.25;
  }
}

@media (max-width: 575.98px) {
  .hero-section {
    min-height: 100vh;
  }

  .hero-content {
    padding: 0 1.5rem 0 5%;
    max-width: 95%;
  }

  .hero-heading {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 0.95rem;
  }

  .hero-badge {
    font-size: 0.75rem;
  }

  .btn-hero-primary,
  .btn-hero-secondary {
    padding: 0.85rem 1.8rem;
    font-size: 1rem;
  }

  .hero-bg {
    object-position: 65% 25%;
  }

  .hero-stats {
    gap: 1rem;
  }

  .stat-number {
    font-size: 1.4rem;
  }

  .hero-characters {
    width: 55%;
    opacity: 0.2;
  }

  .hero-particles {
    display: none;
  }
}
</style>
