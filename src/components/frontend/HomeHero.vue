<script setup>
/**
 * 首頁 Hero Banner（滿版設計）
 * smash2.jpg 全幅背景 + 白色漸層遮罩 + 大字標題 CTA
 * 風格參考：玉山銀行官網 — 邊到邊滿版
 */
const bgImg = '/images/index/smash2.jpg'
</script>

<template>
  <section class="hero-section">
    <!-- 背景圖 -->
    <img :src="bgImg" alt="羽球殺球" class="hero-bg" />
    <!-- 漸層遮罩：左白右透 -->
    <div class="hero-overlay"></div>
    <!-- 文字內容 -->
    <div class="hero-content">
      <h1 class="hero-heading mb-3">
        揮灑汗水，盡享羽球<span class="hero-accent">樂趣</span>
      </h1>
      <p class="hero-subtitle mb-5">
        專業場地、優質設備、熱情球友，讓每一次揮拍都成為美好回憶。<br />
        立即預約場地，開始你的羽球之旅！
      </p>
      <div class="d-flex gap-3 flex-wrap">
        <RouterLink to="/booking" class="btn btn-brand btn-hero">
          <i class="bi bi-calendar-check me-2"></i>立即預約
        </RouterLink>
        <RouterLink to="/products" class="btn btn-brand-outline btn-hero">
          <i class="bi bi-shop me-2"></i>瀏覽商城
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ===== 滿版 Hero Section ===== */
.hero-section {
  position: relative;
  width: 100%;
  overflow: hidden;
  min-height: 520px;
  background-color: #0a0a0a;
}

/* 背景圖：填滿整個區塊 */
.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 25%;
  transition: transform 0.8s ease;
}

.hero-section:hover .hero-bg {
  transform: scale(1.03);
}

/* 漸層遮罩：底部暗色漸層確保文字可讀 */
.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      to right,
      rgba(0, 0, 0, 0.55) 0%,
      rgba(0, 0, 0, 0.4) 25%,
      rgba(0, 0, 0, 0.2) 50%,
      transparent 75%
    );
}

/* 文字內容 */
.hero-content {
  position: relative;
  z-index: 2;
  padding: 4.5rem 5rem 4.5rem 12%;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 520px;
  max-width: 55%;
}

/* 標題：放大 */
.hero-heading {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.02em;
  color: #ffffff;
  white-space: nowrap;
}

.hero-accent {
  background: linear-gradient(135deg, #5EEAD4, #38BDF8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 副標：放大 */
.hero-subtitle {
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.9;
  font-size: 1.15rem;
}

/* CTA 按鈕：放大 */
.btn-hero {
  padding: 0.85rem 2.2rem;
  font-size: 1.15rem;
  font-weight: 600;
  border-radius: 0.75rem;
  letter-spacing: 0.03em;
}



/* ===== 響應式 ===== */
@media (max-width: 991.98px) {
  .hero-content {
    padding: 3rem 2.5rem 3rem 5%;
    min-height: 420px;
  }

  .hero-heading {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.05rem;
  }

  .btn-hero {
    padding: 0.75rem 1.8rem;
    font-size: 1.05rem;
  }
}

@media (max-width: 575.98px) {
  .hero-content {
    padding: 2.5rem 1.5rem 2.5rem 4%;
    min-height: 360px;
  }

  .hero-heading {
    font-size: 1.75rem;
    white-space: normal;
  }

  .hero-subtitle {
    font-size: 0.95rem;
  }

  .btn-hero {
    padding: 0.65rem 1.5rem;
    font-size: 1rem;
  }

  .hero-bg {
    object-position: 65% 25%;
  }
}
</style>
