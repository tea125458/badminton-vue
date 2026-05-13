<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  // 接收揪團資料
  game: {
    type: Object,
    required: true
  },
  // 外部傳入：按鈕是否在處理中
  isJoining: {
    type: Boolean,
    default: false
  },
  // 外部傳入：按鈕的主要文字 (用來支援「我要報名」/「再幫朋友卡一位」等動態文字)
  buttonText: {
    type: String,
    default: '確認報名 (現場繳費)'
  },
  // 外部傳入：因為商業邏輯而被禁用 (例如：一般會員已報名)
  isDisabledByLogic: {
    type: Boolean,
    default: false
  }
})

// 定義向外傳遞的事件
const emit = defineEmits(['submit-signup'])

// 表單狀態
const agreeRules = ref(false)
const selectedLevel = ref('初級') // 視覺用選項

// ============================
// 💰 動態費用計算邏輯
// ============================
const totalFee = computed(() => {
  if (!props.game || !props.game.startTime || !props.game.endTime) return 0
  
  // 將 "14:00" 轉成數字 14.0
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + (minutes / 60)
  }
  
  const startHours = parseTime(props.game.startTime)
  const endHours = parseTime(props.game.endTime)
  const duration = Math.max(0, endHours - startHours)
  
  // 每小時 300 元
  return Math.round(duration * 300)
})

// ============================
// 🔒 按鈕狀態防呆邏輯
// ============================
// 按鈕是否禁用
const isButtonDisabled = computed(() => {
  // 1. 如果外部強制禁用 (例如已報名)
  if (props.isDisabledByLogic) return true
  // 2. 如果沒勾選同意
  if (!agreeRules.value) return true
  // 3. 如果正在呼叫 API
  if (props.isJoining) return true
  
  return false
})

// 按鈕最終顯示文字
const finalButtonText = computed(() => {
  if (props.isDisabledByLogic) return props.buttonText // 顯示外部傳入的警告，例如「您已報名」
  if (!agreeRules.value) return '請先同意規範'
  return props.buttonText // 顯示「確認報名 (現場繳費)」或「+1 報名」
})

// 點擊報名按鈕
const handleSubmit = () => {
  if (isButtonDisabled.value) return
  
  // 觸發事件給父層 (PickupGameDetail.vue) 處理真實 API 邏輯
  emit('submit-signup', {
    level: selectedLevel.value
  })
}

// 報名進度百分比
const progressPercent = computed(() => {
  if (!props.game || !props.game.maxPlayers) return 0
  const ratio = props.game.currentPlayers / props.game.maxPlayers
  return Math.min(100, Math.round(ratio * 100))
})
</script>

<template>
  <div class="card border-0 shadow-sm rounded-4 sticky-top signup-panel">
    <div class="card-body p-4 p-lg-5">
      
      <!-- 💰 費用區塊 (Fee Section) -->
      <div class="mb-4">
        <div class="d-flex align-items-center mb-1">
          <span class="small text-secondary fw-bold me-2">費用與報名</span>
          <!-- 📌 現場繳費 Badge -->
          <span class="badge bg-warning text-dark px-2 py-1 rounded-pill small">
            📌 現場繳交給主揪
          </span>
        </div>
        <div class="d-flex align-items-baseline mt-2">
          <h2 class="text-sky-blue fw-bold mb-0 me-1">${{ totalFee }}</h2>
          <span class="text-secondary fw-medium">/人</span>
        </div>
        <div class="text-muted small mt-1">(收費標準：$300 /小時)</div>
      </div>

      <!-- 📊 人數進度條 (Progress Bar) -->
      <div class="mb-4">
        <div class="d-flex justify-content-between small fw-bold mb-2">
          <span class="text-dark">報名狀況</span>
          <span class="text-sky-blue">{{ game?.currentPlayers }} / {{ game?.maxPlayers }} 人</span>
        </div>
        <div class="progress rounded-pill" style="height: 8px;">
          <div 
            class="progress-bar bg-sky-blue" 
            role="progressbar" 
            :style="{ width: `${progressPercent}%` }" 
            :aria-valuenow="progressPercent" 
            aria-valuemin="0" 
            aria-valuemax="100"
          ></div>
        </div>
      </div>

      <!-- 🌟 程度選擇 (Level Selection) -->
      <div class="mb-4">
        <label class="fw-bold mb-3 d-block text-dark">請選擇您的程度</label>
        <div class="d-flex flex-column gap-2">
          
          <label class="form-check level-card border rounded-3 p-3 mb-0 d-flex align-items-center" :class="{'active-card': selectedLevel === '初級'}">
            <input class="form-check-input ms-0 me-3 shadow-none" type="radio" v-model="selectedLevel" value="初級">
            <span class="fw-bold text-dark w-100">初級 (Beginner)</span>
          </label>

          <label class="form-check level-card border rounded-3 p-3 mb-0 d-flex align-items-center" :class="{'active-card': selectedLevel === '中級'}">
            <input class="form-check-input ms-0 me-3 shadow-none" type="radio" v-model="selectedLevel" value="中級">
            <span class="fw-bold text-dark w-100">中級 (Intermediate)</span>
          </label>

          <label class="form-check level-card border rounded-3 p-3 mb-0 d-flex align-items-center" :class="{'active-card': selectedLevel === '高級'}">
            <input class="form-check-input ms-0 me-3 shadow-none" type="radio" v-model="selectedLevel" value="高級">
            <span class="fw-bold text-dark w-100">高級 (Advanced)</span>
          </label>
          
        </div>
      </div>

      <!-- ✅ 同意規範 Checkbox -->
      <div class="form-check mb-4 d-flex align-items-start bg-light p-3 rounded-3 border">
        <input class="form-check-input shadow-none mt-1 ms-1 me-3" type="checkbox" id="agreeRules" v-model="agreeRules" style="width: 18px; height: 18px;">
        <label class="form-check-label small text-secondary fw-medium" for="agreeRules" style="line-height: 1.6;">
          我同意遵守本團長的臨打規範與球館安全規定。
        </label>
      </div>

      <!-- 🚀 報名按鈕 (CTA) -->
      <button 
        class="btn w-100 fw-bold py-3 shadow-sm rounded-pill text-white btn-cta"
        :class="{'disabled-btn': isButtonDisabled}"
        :disabled="isButtonDisabled"
        @click="handleSubmit"
      >
        <span v-if="props.isJoining" class="spinner-border spinner-border-sm me-2"></span>
        <i v-else-if="!isButtonDisabled && !props.isDisabledByLogic" class="bi bi-check-circle-fill me-1"></i>
        {{ finalButtonText }}
      </button>

      <!-- 錯誤/警告提示 -->
      <div v-if="props.isDisabledByLogic" class="text-center text-danger small mt-3 fw-bold">
        <i class="bi bi-exclamation-circle-fill me-1"></i>一般會員無法重複卡位
      </div>

    </div>
  </div>
</template>

<style scoped>
.signup-panel {
  top: 100px;
  background-color: #ffffff;
}

.text-sky-blue { color: #0ea5e9; }
.bg-sky-blue { background-color: #0ea5e9; }

/* 卡片式 Radio 選項 */
.level-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background-color: #ffffff;
}
.level-card:hover {
  background-color: #f8fafc;
  border-color: #bae6fd !important;
}
.level-card.active-card {
  border-color: #0ea5e9 !important;
  background-color: #f0f9ff;
}
.level-card input[type="radio"]:checked {
  background-color: #0ea5e9;
  border-color: #0ea5e9;
}

/* 主按鈕樣式 */
.btn-cta {
  background-color: #0ea5e9;
  border: none;
  transition: all 0.2s ease;
  font-size: 1.05rem;
}
.btn-cta:hover:not(.disabled-btn) {
  background-color: #0284c7;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3) !important;
}
.disabled-btn {
  background-color: #cbd5e1 !important;
  opacity: 1;
  cursor: not-allowed;
}
</style>
