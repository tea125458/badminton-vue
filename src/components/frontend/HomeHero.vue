<script setup>
/**
 * 首頁 Hero Banner（100vh 滿版設計）
 * 風格參考：國泰世華官網 — 全螢幕視覺衝擊
 * smash2.jpg 全幅背景 + 暗色漸層遮罩 + 大字標題 + CTA
 * 底部帶有向下滾動提示動畫
 */
const bgImg = '/images/index/smash2.jpg'

function scrollToContent() {
  const hero = document.querySelector('.hero-section')
  if (hero) {
    window.scrollTo({
      top: hero.offsetHeight - 64,   // 減去 navbar 高度
      behavior: 'smooth',
    })
  }
}
</script>

<template>
  <section class="hero-section">
    <!-- 背景圖 -->
    <img :src="bgImg" alt="羽球殺球" class="hero-bg" />

    <!-- 漸層遮罩 -->
    <div class="hero-overlay"></div>

    <!-- 動態粒子裝飾（純 CSS） -->
    <div class="hero-particles">
      <span v-for="n in 6" :key="n" class="particle" :class="`p-${n}`"></span>
    </div>

    <!-- 文字內容 -->
    <div class="hero-content">
      <div class="hero-badge">
        <i class="bi bi-feather me-1"></i>Clear Skies Badminton
      </div>

      <h1 class="hero-heading">
        揮灑汗水，盡享羽球<span class="hero-accent">樂趣</span>
      </h1>

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
  0%   { transform: scale(1);    }
  100% { transform: scale(1.08); }
}

/* 漸層遮罩：左側深色確保文字可讀 */
.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.7) 0%,
      rgba(0, 0, 0, 0.55) 30%,
      rgba(0, 0, 0, 0.3) 55%,
      rgba(0, 0, 0, 0.15) 75%,
      transparent 100%
    );
}

/* 裝飾粒子 */
.hero-particles {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(94, 234, 212, 0.15);
  animation: float 12s ease-in-out infinite;
}

.p-1 { width: 300px; height: 300px; top: -50px;  right: -80px;  animation-delay: 0s; }
.p-2 { width: 200px; height: 200px; bottom: 10%; left: 60%;     animation-delay: 3s; }
.p-3 { width: 120px; height: 120px; top: 30%;    right: 15%;    animation-delay: 6s; background: rgba(56, 189, 248, 0.1); }
.p-4 { width: 80px;  height: 80px;  bottom: 25%; right: 35%;    animation-delay: 2s; }
.p-5 { width: 150px; height: 150px; top: 60%;    right: 5%;     animation-delay: 8s; background: rgba(56, 189, 248, 0.08); }
.p-6 { width: 60px;  height: 60px;  top: 15%;    left: 45%;     animation-delay: 4s; }

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1);   opacity: 0.6; }
  50%      { transform: translateY(-30px) scale(1.1); opacity: 1;   }
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
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0);    }
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
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: #ffffff;
  margin-bottom: 1.5rem;
}

.hero-accent {
  background: linear-gradient(135deg, #5EEAD4, #38BDF8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 副標 */
.hero-subtitle {
  color: rgba(255, 255, 255, 0.75);
  line-height: 2;
  font-size: 1.2rem;
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
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #5EEAD4, #38BDF8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.85rem;
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
  background: linear-gradient(135deg, #5EEAD4, #38BDF8);
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
  0%, 100% { transform: translateY(0);   }
  50%      { transform: translateY(8px); }
}

/* ===== 響應式 ===== */
@media (max-width: 991.98px) {
  .hero-content {
    padding: 0 2.5rem 0 5%;
    max-width: 75%;
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

  .hero-particles {
    display: none;
  }
}
</style>
