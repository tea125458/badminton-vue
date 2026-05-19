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
  // 外部傳入：按鈕的主要文字
  buttonText: {
    type: String,
    default: '確認報名 (現場繳費)'
  },
  // 外部傳入：因為商業邏輯而被禁用 (例如：一般會員已報名)
  isDisabledByLogic: {
    type: Boolean,
    default: false
  },
  // 🌟 新增：外部傳入，判斷是否為「已報名的普通成員」
  isAlreadyJoined: {
    type: Boolean,
    default: false
  }
})

// 🌟 新增 'cancel-signup' 事件
const emit = defineEmits(['submit-signup', 'cancel-signup'])

// 表單狀態
const agreeRules = ref(false)
const selectedLevel = ref('初級') // 視覺用選項

// ============================
// 💰 動態費用計算邏輯
// ============================
const totalFee = computed(() => {
  if (!props.game || !props.game.startTime || !props.game.endTime) return 0

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + (minutes / 60)
  }

  const startHours = parseTime(props.game.startTime)
  const endHours = parseTime(props.game.endTime)
  const duration = Math.max(0, endHours - startHours)

  // 每小時 300 元
  const totalCost = duration * 300
  return Math.ceil(totalCost / (props.game.currentPlayers || 1))
})

// ============================
// 🔒 按鈕狀態防呆邏輯
// ============================
const isButtonDisabled = computed(() => {
  if (props.isDisabledByLogic) return true
  if (!agreeRules.value) return true
  if (props.isJoining) return true
  return false
})

const finalButtonText = computed(() => {
  if (props.isDisabledByLogic) return props.buttonText
  if (!agreeRules.value) return '請先同意規範'
  return props.buttonText
})

const handleSubmit = () => {
  if (isButtonDisabled.value) return

  const requiredLevel = props.game.skillLevel || 'ALL'
  const levelMapReverse = {
    '初級': 'BEGINNER',
    '中級': 'INTERMEDIATE',
    '高級': 'ADVANCED'
  }
  const userLevelCode = levelMapReverse[selectedLevel.value]

  if (requiredLevel !== 'ALL' && requiredLevel !== userLevelCode) {
    const levelMap = {
      'BEGINNER': '初級',
      'INTERMEDIATE': '中級',
      'ADVANCED': '高級'
    }
    alert(`⚠️ 報名失敗！\n本團長限定程度為「${levelMap[requiredLevel]}」\n您選擇的程度不符合，無法報名。`)
    return
  }

  emit('submit-signup', {
    level: selectedLevel.value
  })
}

const progressPercent = computed(() => {
  if (!props.game || !props.game.maxPlayers) return 0
  const ratio = props.game.currentPlayers / props.game.maxPlayers
  return Math.min(100, Math.round(ratio * 100))
})
</script>

<template>
  <div class="card border-0 shadow-sm rounded-4 sticky-top signup-panel">
    <div class="card-body p-4 p-lg-5">

      <div class="mb-4">
        <div class="text-secondary small fw-medium">費用與報名</div>
        <div class="text-secondary mt-2 p-3 bg-light rounded" style="font-size: 0.85rem;">
          <i class="bi bi-wallet2 me-1"></i> 本場次費用與付款方式，請於現場依主揪指示結算。
        </div>
      </div>

      <div class="mb-4">
        <div class="d-flex justify-content-between small fw-bold mb-2">
          <span class="text-dark">報名狀況</span>
          <span class="text-mori-teal">{{ game?.currentPlayers }} / {{ game?.maxPlayers }} 人</span>
        </div>
        <div class="progress rounded-pill bg-light" style="height: 8px;">
          <div
            class="progress-bar bg-mori-teal rounded-pill"
            role="progressbar"
            :style="{ width: `${progressPercent}%` }"
            :aria-valuenow="progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
      </div>

      <template v-if="props.isAlreadyJoined">
        <hr class="text-secondary opacity-25 my-4">
        <div class="alert alert-success d-flex align-items-center mb-4 py-2 px-3 fw-bold" role="alert" style="background-color: #E6F5F3; border-color: #2A9D8F; color: #2A9D8F;">
          <i class="bi bi-check-circle-fill me-2 fs-5"></i>
          <div>🎉 報名成功！您已在名單中</div>
        </div>

        <button
          class="btn btn-outline-danger w-100 rounded-pill fw-bold shadow-sm"
          style="padding: 12px 0; border-width: 2px;"
          @click="emit('cancel-signup')"
        >
          <i class="bi bi-box-arrow-right me-1"></i> 退出揪團
        </button>
      </template>

      <template v-else>
        <div class="mb-4">
          <label class="fw-bold mb-3 d-block text-dark">請選擇您的程度</label>
          <div class="d-flex flex-column gap-2">

            <label class="form-check-label level-card border rounded-3 p-3 mb-0 text-center" :class="{'active-card': selectedLevel === '初級'}">
              <input class="form-check-input" type="radio" v-model="selectedLevel" value="初級">
              <span class="fw-bold d-block">初級 (Beginner)</span>
            </label>

            <label class="form-check-label level-card border rounded-3 p-3 mb-0 text-center" :class="{'active-card': selectedLevel === '中級'}">
              <input class="form-check-input" type="radio" v-model="selectedLevel" value="中級">
              <span class="fw-bold d-block">中級 (Intermediate)</span>
            </label>

            <label class="form-check-label level-card border rounded-3 p-3 mb-0 text-center" :class="{'active-card': selectedLevel === '高級'}">
              <input class="form-check-input" type="radio" v-model="selectedLevel" value="高級">
              <span class="fw-bold d-block">高級 (Advanced)</span>
            </label>

          </div>
        </div>

        <div class="form-check mb-4 d-flex align-items-start bg-light p-3 rounded-3 border-0">
          <input class="form-check-input-checkbox shadow-none mt-1 ms-1 me-3" type="checkbox" id="agreeRules" v-model="agreeRules" style="width: 18px; height: 18px;">
          <label class="form-check-label-text small text-secondary fw-medium" for="agreeRules" style="line-height: 1.6; cursor: pointer;">
            我同意遵守本團長的臨打規範與球館安全規定。
          </label>
        </div>

        <button
          class="btn w-100 fw-bold py-3 shadow-sm rounded-pill btn-cta"
          :class="{
            'btn-mori-success-disabled': props.isDisabledByLogic && buttonText === '您已報名',
            'disabled-btn': (!props.isDisabledByLogic && isButtonDisabled) || (props.isDisabledByLogic && buttonText !== '您已報名')
          }"
          :disabled="isButtonDisabled"
          @click="handleSubmit"
        >
          <span v-if="props.isJoining" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else-if="props.isDisabledByLogic && buttonText === '您已報名'" class="bi bi-check2-circle me-1 fs-5 align-middle"></i>
          <i v-else-if="!isButtonDisabled && !props.isDisabledByLogic" class="bi bi-check-circle-fill me-1"></i>
          {{ finalButtonText }}
        </button>

        <div v-if="props.isDisabledByLogic && buttonText !== '您已報名'" class="text-center text-mori-coral small mt-3 fw-bold">
          <i class="bi bi-exclamation-circle-fill me-1"></i>一般會員無法重複卡位
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
/* =========================================
   SignupPanel.vue 森系專屬樣式
   ========================================= */

.signup-panel {
  top: 100px;
  background-color: #ffffff;
}

/* 品牌色 */
.text-mori-teal { color: #457B9D !important; }
.bg-mori-teal { background-color: #457B9D !important; }
.text-mori-coral { color: #E07A5F !important; }

/* ============================
   🌟 卡片式 Radio 選項
   ============================ */
.level-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background-color: #ffffff;
  color: #64748B;
}
/* 隱藏原生 Radio 圓點 */
.form-check-input {
  display: none;
}
.level-card:hover {
  background-color: #F1FAEE;
  border-color: #457B9D !important;
  color: #457B9D;
}
/* 選中狀態 */
.level-card.active-card {
  border-color: #457B9D !important;
  background-color: #457B9D;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(69, 123, 157, 0.2);
}
.level-card.active-card .text-dark {
  color: #ffffff !important; /* 確保選中時文字反白 */
}

/* ============================
   🚀 按鈕樣式
   ============================ */
.btn-cta {
  background-color: #457B9D;
  color: #ffffff;
  border: none;
  transition: all 0.2s ease;
  font-size: 1.05rem;
}
.btn-cta:hover:not(.disabled-btn):not(.btn-mori-success-disabled) {
  background-color: #386785;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(69, 123, 157, 0.3) !important;
  color: #ffffff;
}

/* 狀態 1：因未勾選同意而禁用 (一般灰色) */
.disabled-btn {
  background-color: #CBD5E1 !important;
  color: #ffffff !important;
  opacity: 1;
  cursor: not-allowed;
  box-shadow: none !important;
}

/* 狀態 2：因商業邏輯禁用 (例如：您已報名 - 帶有質感的淺綠色) */
.btn-mori-success-disabled {
  background-color: #E6F5F3 !important;
  color: #2A9D8F !important;
  border: 1px solid #2A9D8F !important;
  opacity: 1 !important;
  font-weight: 700;
  cursor: default;
  box-shadow: none !important;
}
</style>
