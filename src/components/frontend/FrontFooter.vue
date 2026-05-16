<script setup>
/**
 * 前台 Footer — 業界專業四欄式設計
 * 品牌區 | 快速連結 | 營業資訊 | 聯絡我們
 */
import { ref } from 'vue'

const copied = ref(false)
const currentYear = new Date().getFullYear()

function copyEmail() {
  navigator.clipboard.writeText('ygtq.badminton@gmail.com')
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <footer class="front-footer">
    <!-- 主要 Footer 內容 -->
    <div class="footer-main">
      <div class="container-fluid px-lg-5">
        <div class="row gy-4">
          <!-- 品牌區 -->
          <div class="col-lg-3 col-md-6">
            <div class="footer-brand mb-3">
              <i class="bi bi-feather me-2"></i>羽過天晴
            </div>
            <p class="footer-desc">
              專業場地、優質設備、熱情球友。<br>
              讓每一次揮拍都成為美好回憶。
            </p>
            <!-- 社群連結 -->
            <div class="social-links">
              <a href="#" class="social-icon" title="Facebook" aria-label="Facebook">
                <i class="bi bi-facebook"></i>
              </a>
              <a href="#" class="social-icon" title="Instagram" aria-label="Instagram">
                <i class="bi bi-instagram"></i>
              </a>
              <a href="#" class="social-icon" title="LINE" aria-label="LINE">
                <i class="bi bi-line"></i>
              </a>
              <a href="#" class="social-icon" title="YouTube" aria-label="YouTube">
                <i class="bi bi-youtube"></i>
              </a>
            </div>
          </div>

          <!-- 快速連結 -->
          <div class="col-lg-3 col-md-6">
            <h6 class="footer-heading">快速連結</h6>
            <ul class="footer-links">
              <li><RouterLink to="/booking">場地預約</RouterLink></li>
              <li><RouterLink to="/pickup">臨打揪團</RouterLink></li>
              <li><RouterLink to="/products">天晴商城</RouterLink></li>
              <li><RouterLink to="/announcements">最新公告</RouterLink></li>
              <li><RouterLink to="/register">加入會員</RouterLink></li>
            </ul>
          </div>

          <!-- 營業資訊 -->
          <div class="col-lg-3 col-md-6">
            <h6 class="footer-heading">營業資訊</h6>
            <ul class="footer-info-list">
              <li>
                <i class="bi bi-clock me-2"></i>
                <span>每日營業 <strong>10:00 - 22:00</strong>（含假日）</span>
              </li>
              <li>
                <i class="bi bi-geo-alt me-2"></i>
                <span>A館：台北市大安區忠孝東路四段120號B1</span>
              </li>
              <li>
                <i class="bi bi-geo-alt me-2"></i>
                <span>B館：台北市信義區松仁路58號2F</span>
              </li>
              <li>
                <i class="bi bi-geo-alt me-2"></i>
                <span>C館：台北市中山區南京東路三段89號1F</span>
              </li>
            </ul>
          </div>

          <!-- 聯絡我們 -->
          <div class="col-lg-3 col-md-6">
            <h6 class="footer-heading">聯絡我們</h6>
            <ul class="footer-info-list">
              <li>
                <i class="bi bi-telephone me-2"></i>
                <span>02-2771-0001（A館）</span>
              </li>
              <li>
                <i class="bi bi-envelope me-2"></i>
                <span>
                  <button class="btn-copy-email" @click="copyEmail">
                    {{ copied ? '✓ 已複製！' : 'ygtq.badminton@gmail.com' }}
                  </button>
                </span>
              </li>
              <li>
                <i class="bi bi-chat-dots me-2"></i>
                <span>LINE 官方帳號：@clearskies</span>
              </li>
            </ul>

            <!-- LINE QR placeholder -->
            <div class="line-qr-placeholder mt-3">
              <i class="bi bi-qr-code-scan"></i>
              <span>掃碼加入 LINE</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部版權列 -->
    <div class="footer-bottom">
      <div class="container-fluid px-lg-5">
        <div class="row align-items-center gy-2">
          <div class="col-md-6">
            <p class="mb-0">
              &copy; {{ currentYear }} Clear Skies Badminton Club. All rights reserved.
            </p>
          </div>
          <div class="col-md-6 text-md-end">
            <a href="#" class="footer-legal-link">隱私權政策</a>
            <span class="mx-2">|</span>
            <a href="#" class="footer-legal-link">服務條款</a>
            <span class="mx-2">|</span>
            <a href="#" class="footer-legal-link">FAQ</a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ===== Footer 主區塊 ===== */
.front-footer {
  margin-top: auto;
}

.footer-main {
  background: #0f172a;
  color: #cbd5e1;
  padding: 1.75rem 0 1.4rem;
}

/* 品牌 */
.footer-brand {
  font-size: 1.15rem;
  font-weight: 800;
  background: linear-gradient(135deg, #5EEAD4, #38BDF8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-desc {
  color: #94a3b8;
  font-size: 0.88rem;
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

/* 社群圖示 */
.social-links {
  display: flex;
  gap: 0.6rem;
}

.social-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  text-decoration: none;
  transition: all 0.25s ease;
}

.social-icon:hover {
  background: linear-gradient(135deg, var(--brand-teal, #14b8a6), var(--brand-sky, #38bdf8));
  color: white;
  transform: translateY(-2px);
}

/* 欄位標題 */
.footer-heading {
  color: #f1f5f9;
  font-weight: 700;
  font-size: 0.92rem;
  margin-bottom: 0.6rem;
  letter-spacing: 0.03em;
  position: relative;
  padding-bottom: 0.6rem;
}

.footer-heading::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 28px;
  height: 2px;
  background: linear-gradient(90deg, #14b8a6, #38bdf8);
  border-radius: 2px;
}

/* 快速連結 */
.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 0.35rem;
}

.footer-links a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.88rem;
  transition: color 0.2s ease, padding-left 0.2s ease;
}

.footer-links a:hover {
  color: #5eead4;
  padding-left: 4px;
}

/* 資訊列表 */
.footer-info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-info-list li {
  display: flex;
  align-items: flex-start;
  font-size: 0.88rem;
  color: #94a3b8;
  margin-bottom: 0.4rem;
  line-height: 1.5;
}

.footer-info-list li i {
  color: #5eead4;
  margin-top: 0.15rem;
  flex-shrink: 0;
}

/* 複製 email 按鈕 */
.btn-copy-email {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 0;
  font-size: 0.88rem;
  cursor: pointer;
  transition: color 0.2s ease;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
}

.btn-copy-email:hover {
  color: #5eead4;
}

/* LINE QR */
.line-qr-placeholder {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.6rem 1rem;
  border-radius: 0.6rem;
  font-size: 0.8rem;
  color: #64748b;
}

.line-qr-placeholder i {
  font-size: 1.3rem;
  color: #06c755;
}

/* ===== 底部版權列 ===== */
.footer-bottom {
  background: #0b1120;
  padding: 0.6rem 0;
  font-size: 0.78rem;
  color: #64748b;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-legal-link {
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-legal-link:hover {
  color: #5eead4;
}
</style>
