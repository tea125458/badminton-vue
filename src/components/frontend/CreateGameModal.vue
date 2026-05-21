<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as bootstrap from 'bootstrap'
// 🌟 引入 API
import { usePickupGameApi } from '@/composables/usePickupGameApi'
const emit = defineEmits(['refresh-list'])
const router = useRouter()

// 判斷主揪性別 (防止男生開純女團)
const memberInfo = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('memberInfo')) || {}
  } catch {
    return {}
  }
})
const isHostMale = computed(() => memberInfo.value.gender === 'MALE' || memberInfo.value.gender === '男')
const isHostFemale = computed(() => memberInfo.value.gender === 'FEMALE' || memberInfo.value.gender === '女')

// 🌟 把需要用到的東西解構出來 (formData 直接用 API 裡的 newGame)
const { newGame, courts, fetchCourts, createPickupGame } = usePickupGameApi()
const minDate = new Date().toISOString().split('T')[0]
// 產生時間選單 (06:00 ~ 23:00)
const timeOptions = Array.from({ length: 18 }, (_, i) => {
  const hour = (i + 6).toString().padStart(2, '0')
  return `${hour}:00`
})
// 邏輯驗證：結束時間必須晚於開始時間
const isValidTime = computed(() => {
  if (!newGame.value.startTime || !newGame.value.endTime) return false
  const start = parseInt(newGame.value.startTime.replace(':', ''))
  const end = parseInt(newGame.value.endTime.replace(':', ''))
  return end > start
})
const modalRef = ref(null)
let modalInstance = null
onMounted(() => {
  fetchCourts()
  modalInstance = new bootstrap.Modal(modalRef.value)

  // 幫 newGame 塞入前台預設值
  newGame.value.gameDate = ''
  newGame.value.startTime = ''
  newGame.value.endTime = ''
  newGame.value.maxPlayers = 6
  newGame.value.skillLevel = 'ALL'
  newGame.value.requiredGender = 'ALL'
  newGame.value.bookingId = null
  selectedBookingId.value = ''
})

// 🌟 從後端撈取登入者自己的可用預約
import api from '@/api'
const myBookings = ref([])
const bookingsLoaded = ref(false)
const fetchMyBookings = async () => {
  bookingsLoaded.value = false
  try {
    // 🌟 同時撈取預約 + 揪團，排除已被使用的預約
    const [bookingsRes, gamesRes] = await Promise.all([
      api.get('/bookings'),
      api.get('/pickup-games'),
    ])
    const allBookings = bookingsRes
    const allGames = gamesRes
    const todayStr = new Date().toISOString().split('T')[0]
    const myId = memberInfo.value.memberId

    // 🌟 找出已經被揪團綁定的 bookingId（排除已取消的）
    const usedBookingIds = new Set(
      allGames
        .filter(g => g.bookingId && g.status !== 'CANCELLED')
        .map(g => g.bookingId)
    )

    const now = new Date()

    myBookings.value = allBookings
      .filter(b => {
        if (b.member?.memberId !== myId) return false
        if (b.status !== 'CONFIRMED') return false
        if (b.bookingDate < todayStr) return false
        if (usedBookingIds.has(b.bookingId)) return false
        // 🌟 今天的預約：開始時間已過就不能再拿來開團
        if (b.bookingDate === todayStr && b.startTime) {
          const startDt = new Date(`${b.bookingDate}T${b.startTime}`)
          if (startDt <= now) return false
        }
        return true
      })
      .map(b => ({
        bookingId: b.bookingId,
        courtId: b.court?.courtId,
        venueName: b.court?.venue?.venueName || '未指定場館',
        courtName: b.court?.courtName || '未指定場地',
        bookingDate: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
      }))
  } catch (err) {
    console.error('抓取我的預約失敗', err)
    myBookings.value = []
  } finally {
    bookingsLoaded.value = true
  }
}
const selectedBookingId = ref('')
const applyBooking = () => {
  const b = myBookings.value.find(x => x.bookingId === selectedBookingId.value)
  if (b) {
    newGame.value.bookingId = b.bookingId
    newGame.value.court.courtId = b.courtId
    newGame.value.gameDate = b.bookingDate
    newGame.value.startTime = b.startTime
    newGame.value.endTime = b.endTime
    // 為了顯示用，可暫存場地名稱
    newGame.value.venueName = b.venueName
    newGame.value.courtName = b.courtName
  }
}

const showModal = () => {
  selectedBookingId.value = ''
  bookingsLoaded.value = false
  fetchMyBookings()  // 🌟 每次打開 Modal 時都重新撈取最新的預約資料
  modalInstance.show()
}

// 🌟 跳轉到預約頁面
const goToBooking = () => {
  modalInstance.hide()
  router.push('/booking')
}
defineExpose({ showModal })
// 送出表單
const submitForm = async () => {
  // 🌟 核心差異：前台自己發起揪團，所以把登入者 ID 偷偷塞進去
  newGame.value.host.memberId = memberInfo.value.memberId || 1
  // 🌟 將選中的標籤寫入 description（用「・」分隔，附加在備註前面）
  if (selectedTags.value.length > 0) {
    const tagStr = selectedTags.value.join('・')
    newGame.value.description = tagStr + (newGame.value.description ? '\n' + newGame.value.description : '')
  }
  // 直接呼叫後台寫好的新增邏輯！
  await createPickupGame()
  selectedTags.value = []
  modalInstance.hide()
  emit('refresh-list')
}

// ⚡ 一鍵輸入 (Demo 用)
const quickFill = () => {
  newGame.value.feePerPerson = 300
  newGame.value.maxPlayers = 6
  newGame.value.skillLevel = 'INTERMEDIATE'
  newGame.value.requiredGender = 'ALL'
  newGame.value.description = '🏸 週末歡樂流汗團！新手友善，主揪會帶勝利比賽級羽球，請自備水壺跟毛巾。\n氣氛輕鬆不計較輸贏，打完球還可以一起去附近吃宵夜喔！😎'
  selectedTags.value = ['新手友善', '歡樂流汗']
}

// ============================
// 🏷️ 揪團特色標籤選擇器
// ============================
const tagOptions = ['新手友善', '歡樂流汗', '競技切磋', '佛系休閒', '提供用球', '可借球拍', '現場付現', '電子支付']
const selectedTags = ref([])
const MAX_TAGS = 3

const toggleTag = (tag) => {
  const idx = selectedTags.value.indexOf(tag)
  if (idx > -1) {
    // 已選取 → 移除
    selectedTags.value.splice(idx, 1)
  } else {
    // 未選取 → 檢查上限
    if (selectedTags.value.length >= MAX_TAGS) {
      console.log(`最多只能選擇 ${MAX_TAGS} 個標籤`)
      return
    }
    selectedTags.value.push(tag)
  }
}
const isTagSelected = (tag) => selectedTags.value.includes(tag)
const isTagDisabled = (tag) => !isTagSelected(tag) && selectedTags.value.length >= MAX_TAGS
</script>
<template>
  <div class="modal fade" ref="modalRef" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content border-0 shadow-lg rounded-4">

        <div class="modal-header border-bottom-0 bg-light rounded-top-4 pb-2 pt-3 px-4">
          <h5 class="modal-title fw-bold text-dark d-flex align-items-center">
            <i class="bi bi-plus-circle-fill text-sky-blue me-2 fs-4"></i> 發起揪團
            <button type="button" class="btn btn-sm text-warning p-0 ms-2" @click="quickFill" title="一鍵輸入" style="border: none; background: transparent;">
              <i class="bi bi-lightning-fill fs-5"></i>
            </button>
          </h5>
          <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body px-4 pt-3 pb-4">
          <form @submit.prevent="submitForm">

            <!-- 🌟 新版：從我的預約中挑選場地時段 -->
            <div class="mb-4">
              <label class="form-label fw-bold text-secondary small mb-1">1. 選擇您的預約場地與時段</label>

              <!-- 🔄 載入中 -->
              <div v-if="!bookingsLoaded" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm me-2 text-sky-blue"></div>
                <span class="small">正在載入您的可用預約...</span>
              </div>

              <!-- ⚠️ 無可用預約時的友善引導 -->
              <div v-else-if="myBookings.length === 0" class="empty-booking-guide rounded-4 p-4 text-center">
                <div class="empty-icon-wrapper mx-auto mb-3">
                  <i class="bi bi-calendar-x fs-1"></i>
                </div>
                <h6 class="fw-bold text-dark mb-2">目前沒有可用的場地預約</h6>
                <p class="text-secondary small mb-3" style="line-height: 1.7;">
                  發起揪團前，需要先<strong class="text-dark">預約一個場地</strong>。<br>
                  預約完成後再回來發起揪團，系統會自動帶入場地與時段資訊喔！
                </p>
                <div class="d-flex flex-column gap-2 align-items-center">
                  <button type="button" class="btn btn-sky-blue rounded-pill fw-bold px-4 py-2 shadow-sm" @click="goToBooking">
                    <i class="bi bi-calendar-plus me-1"></i> 前往預約球場
                  </button>
                  <div class="guide-steps mt-3 w-100">
                    <div class="d-flex align-items-center gap-3 text-start mb-2">
                      <span class="step-badge">1</span>
                      <span class="small text-secondary">先到「預約球場」頁面預約場地與時段</span>
                    </div>
                    <div class="d-flex align-items-center gap-3 text-start mb-2">
                      <span class="step-badge">2</span>
                      <span class="small text-secondary">預約成功後，回來點擊「發起揪團」</span>
                    </div>
                    <div class="d-flex align-items-center gap-3 text-start">
                      <span class="step-badge">3</span>
                      <span class="small text-secondary">選擇已預約的場地，輕鬆開團找球友！</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ✅ 有可用預約時正常顯示下拉選單 -->
              <template v-else>
                <div class="input-group">
                  <span class="input-group-text bg-white text-muted border-end-0"><i class="bi bi-calendar-check"></i></span>
                  <select class="form-select border-start-0 ps-0 shadow-none" v-model="selectedBookingId" @change="applyBooking" required>
                    <option value="" disabled>請選擇可用預約...</option>
                    <option v-for="b in myBookings" :key="b.bookingId" :value="b.bookingId">
                      {{ b.bookingDate }} ({{ b.startTime }}-{{ b.endTime }}) | {{ b.venueName }} - {{ b.courtName }}
                    </option>
                  </select>
                </div>
                <div class="d-flex align-items-center mt-2 text-muted" style="font-size: 0.75rem;">
                  <i class="bi bi-info-circle me-1"></i>
                  <span>僅顯示未來且尚未開團的預約。找不到？<a href="#" class="text-sky-blue fw-bold text-decoration-none" @click.prevent="goToBooking">去預約新場地</a></span>
                </div>
              </template>
            </div>

            <!-- 自動帶入的預約資訊 (唯讀) -->
            <div class="card bg-light border-0 rounded-3 p-3 mb-4" v-if="selectedBookingId">
              <div class="row text-secondary small fw-medium">
                <div class="col-6 mb-2"><i class="bi bi-geo-alt me-1 text-sky-blue"></i> {{ newGame.venueName }} - {{ newGame.courtName }}</div>
                <div class="col-6 mb-2"><i class="bi bi-calendar-event me-1 text-sky-blue"></i> {{ newGame.gameDate }}</div>
                <div class="col-12"><i class="bi bi-clock me-1 text-sky-blue"></i> {{ newGame.startTime }} ~ {{ newGame.endTime }}</div>
              </div>
            </div>
            
            <div class="row mb-4" v-if="selectedBookingId">
              <div class="col-6">
                <label class="form-label fw-bold text-secondary small mb-1">程度要求</label>
                <div class="input-group">
                  <span class="input-group-text bg-white text-muted border-end-0"><i class="bi bi-bar-chart"></i></span>
                  <select class="form-select border-start-0 ps-0 shadow-none" v-model="newGame.skillLevel">
                    <option value="ALL">不限</option>
                    <option value="BEGINNER">初級</option>
                    <option value="INTERMEDIATE">中級</option>
                    <option value="ADVANCED">高級</option>
                  </select>
                </div>
              </div>
              <div class="col-6">
                <label class="form-label fw-bold text-secondary small mb-1">徵求人數</label>
                <div class="input-group">
                  <span class="input-group-text bg-white text-muted border-end-0"><i class="bi bi-people"></i></span>
                  <select class="form-select border-start-0 ps-0 shadow-none" v-model.number="newGame.maxPlayers">
                    <option v-for="n in 11" :key="n" :value="n + 1">{{ n + 1 }} 人</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- 🌟 性別限制 (防呆檢查) -->
            <div class="mb-4" v-if="selectedBookingId">
              <label class="form-label fw-bold text-secondary small mb-1">性別限制</label>
              <div class="input-group">
                <span class="input-group-text bg-white text-muted border-end-0"><i class="bi bi-gender-ambiguous"></i></span>
                <select class="form-select border-start-0 ps-0 shadow-none" v-model="newGame.requiredGender">
                  <option value="ALL">不限男女</option>
                  <option value="MALE" :disabled="isHostFemale">
                    限男性 {{ isHostFemale ? '(您為女性，無法發起純男團)' : '' }}
                  </option>
                  <option value="FEMALE" :disabled="isHostMale">
                    限女性 {{ isHostMale ? '(您為男性，無法發起純女團)' : '' }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 🏷️ 揪團特色標籤選擇器（扁平極簡版） -->
            <div class="mb-4" v-if="selectedBookingId">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <label class="form-label fw-bold text-secondary small mb-0">
                  揪團氣氛 / 特色
                  <span class="text-muted fw-normal ms-1">(最多 3 項)</span>
                </label>
                <span class="fw-bold small" :class="selectedTags.length >= MAX_TAGS ? 'text-warning' : 'text-sky-blue'">
                  {{ selectedTags.length }}/{{ MAX_TAGS }}
                </span>
              </div>
              <div class="d-flex flex-wrap gap-2">
                <button
                  v-for="tag in tagOptions"
                  :key="tag"
                  type="button"
                  class="btn rounded-pill btn-sm px-3 tag-btn"
                  :class="isTagSelected(tag) ? 'btn-tag-active' : 'btn-tag-idle'"
                  :disabled="isTagDisabled(tag)"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}<span v-if="isTagSelected(tag)" class="ms-1">&times;</span>
                </button>
              </div>
            </div>

            <button type="submit" class="btn w-100 rounded-pill fw-bold text-white py-2 shadow-sm btn-sky-blue" :disabled="!selectedBookingId">
              確認發佈揪團
            </button>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.text-sky-blue { color: #0ea5e9; }
.btn-sky-blue { background-color: #0ea5e9; border: none; transition: all 0.2s; }
.btn-sky-blue:hover { background-color: #0284c7; transform: translateY(-1px); }
.form-control:focus, .form-select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 0.2rem rgba(14, 165, 233, 0.25); }
/* 🏷️ 標籤按鈕微動效 */
.tag-btn { transition: all 0.15s ease-in-out; font-size: 0.8rem; }
.tag-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
.tag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
/* 🌟 已選取標籤：使用主題亮藍色 + 白字 */
.btn-tag-active { background-color: #0ea5e9; border-color: #0ea5e9; color: #fff; }
.btn-tag-active:hover { background-color: #0284c7; border-color: #0284c7; color: #fff; }
/* 未選取標籤：乾淨白底 + 淺灰邊框，輕盈感 */
.btn-tag-idle { background-color: #fff; border: 1px solid #dee2e6; color: #6c757d; }
.btn-tag-idle:hover:not(:disabled) { border-color: #0ea5e9; color: #0ea5e9; }

/* ============================
   🌟 無預約時的引導區塊樣式
   ============================ */
.empty-booking-guide {
  background: linear-gradient(135deg, #F0F9FF 0%, #F8FAFC 50%, #FFF7ED 100%);
  border: 1px dashed #BAE6FD;
}
.empty-icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: #E0F2FE;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0EA5E9;
}
.step-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #0EA5E9;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.guide-steps {
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 16px;
}
</style>
