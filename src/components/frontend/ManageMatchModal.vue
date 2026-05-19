<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as bootstrap from 'bootstrap'
import api from '@/api'
import Swal from 'sweetalert2'

const props = defineProps({
  game: { type: Object, default: null }
})
const emit = defineEmits(['refresh-list'])

const router = useRouter()

// ============================
// 🎯 Modal 控制
// ============================
const modalRef = ref(null)
let modalInstance = null

onMounted(() => {
  modalInstance = new bootstrap.Modal(modalRef.value)
})

const showModal = () => {
  if (props.game) {
    activeTab.value = 'roster'
    fetchRoster()
  }
  modalInstance.show()
}
defineExpose({ showModal })

// 🌟 點擊按鈕跳轉至前台詳細頁
const goToDetailPage = () => {
  if (!props.game?.gameId) return
  if (modalInstance) {
    modalInstance.hide()
  }
  router.push(`/pickup/${props.game.gameId}`)
}

// ============================
// 🏷️ 頁籤切換
// ============================
const activeTab = ref('roster') // 'roster' | 'status' | 'broadcast'

// ============================
// 📋 頁籤 1：報名名單 (Roster)
// ============================
const roster = ref([])
const rosterLoading = ref(false)

const fetchRoster = async () => {
  if (!props.game?.gameId) return
  rosterLoading.value = true
  try {
    const res = await api.get(`/pickup-games/${props.game.gameId}/signups`)
    roster.value = res
  } catch (err) {
    console.error('抓取報名名單失敗', err)
    roster.value = []
  } finally {
    rosterLoading.value = false
  }
}

// 付款 Toggle
const togglePayment = async (signup) => {
  signup.paid = !signup.paid
}

// 移除球友
const removePlayer = async (signup) => {
  const result = await Swal.fire({
    icon: 'warning',
    title: '確定移除這位球友嗎？',
    text: `將移除 ${signup.member?.fullName || '球友'} 的報名`,
    showCancelButton: true,
    confirmButtonText: '確定移除',
    cancelButtonText: '取消',
    confirmButtonColor: '#E07A5F', // 換成森系珊瑚紅
    cancelButtonColor: '#94A3B8',
  })
  if (result.isConfirmed) {
    try {
      await api.delete(`/pickup-game-signups/${signup.signupId}`)
      Swal.fire({ icon: 'success', title: '已移除', showConfirmButton: false, timer: 1000 })
      fetchRoster()
      emit('refresh-list')
    } catch (err) {
      console.error('移除失敗', err)
      Swal.fire({ icon: 'error', title: '移除失敗', confirmButtonText: '我知道了' })
    }
  }
}

// 格式化手機號碼
const formatPhone = (phone) => {
  if (!phone) return '未提供'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0,4)}-${cleaned.slice(4,7)}-${cleaned.slice(7)}`
  }
  return phone
}

// ============================
// ⚙️ 頁籤 2：活動狀態 (Status)
// ============================
const isOpen = computed({
  get: () => props.game?.status === 'OPEN',
  set: () => {}
})

const toggleStatus = async () => {
  if (!props.game) return
  const newStatus = props.game.status === 'OPEN' ? 'CLOSED' : 'OPEN'
  const actionText = newStatus === 'CLOSED' ? '停止報名' : '重新開放報名'

  try {
    await api.put(`/pickup-games/${props.game.gameId}`, {
      ...props.game,
      status: newStatus
    })
    props.game.status = newStatus
    Swal.fire({
      icon: 'success',
      title: `已${actionText}`,
      timer: 1200,
      showConfirmButton: false
    })
    emit('refresh-list')
  } catch (err) {
    console.error('更新狀態失敗', err)
    Swal.fire({ icon: 'error', title: '操作失敗', confirmButtonText: '我知道了' })
  }
}

const cancelGame = async () => {
  const result = await Swal.fire({
    icon: 'warning',
    title: '確定要取消這場揪團嗎？',
    text: '已報名的球友將收到通知。此操作無法復原。',
    showCancelButton: true,
    confirmButtonText: '確定取消揪團',
    cancelButtonText: '返回',
    confirmButtonColor: '#E07A5F', // 換成森系珊瑚紅
    cancelButtonColor: '#94A3B8',
  })
  if (result.isConfirmed) {
    try {
      await api.put(`/pickup-games/${props.game.gameId}`, {
        ...props.game,
        status: 'CANCELLED'
      })
      Swal.fire({
        icon: 'success',
        title: '已取消',
        text: '該揪團已被取消',
        confirmButtonText: '好的',
        confirmButtonColor: '#457B9D', // 換成森藍綠
      })
      modalInstance.hide()
      emit('refresh-list')
    } catch (err) {
      console.error('取消失敗', err)
      Swal.fire({ icon: 'error', title: '取消失敗', confirmButtonText: '我知道了' })
    }
  }
}

// ============================
// 🧰 Computed Helpers
// ============================
const levelMap = {
  'BEGINNER': '初級',
  'INTERMEDIATE': '中級',
  'ADVANCED': '高級',
  'ALL': '不限'
}
const displayLevel = computed(() => levelMap[props.game?.skillLevel] || '不限')

const cardTitle = computed(() => {
  if (!props.game) return '管理揪團'
  const dateStr = props.game.gameDate || ''
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  const dow = dateStr ? days[new Date(dateStr).getDay()] : ''
  const hour = props.game.startTime ? parseInt(props.game.startTime.split(':')[0]) : 0
  let period = '早上'
  if (hour >= 12 && hour < 18) period = '下午'
  else if (hour >= 18) period = '晚間'
  return `${dow}${period}場`
})

watch(() => props.game?.gameId, (newId) => {
  if (newId) fetchRoster()
})

// ============================
// 📢 頁籤 3：群發公告 (Broadcast)
// ============================
const broadcastMessage = ref('')
const isSending = ref(false)

const sendBroadcast = async () => {
  if (!broadcastMessage.value.trim()) {
    Swal.fire({ icon: 'warning', title: '請輸入公告內容', confirmButtonText: '好的' })
    return
  }
  const confirm = await Swal.fire({
    icon: 'question',
    title: '確定要發送公告嗎？',
    text: '系統將發送 Email 給所有已報名的球友',
    showCancelButton: true,
    confirmButtonText: '確定發送',
    cancelButtonText: '取消',
    confirmButtonColor: '#457B9D', // 換成森藍綠
  })
  if (!confirm.isConfirmed) return

  isSending.value = true
  try {
    const res = await api.post(`/pickup-games/${props.game.gameId}/broadcast`, {
      message: broadcastMessage.value.trim()
    })
    Swal.fire({
      icon: 'success',
      title: '公告已發送！',
      text: `成功寄出 ${res.sent} / ${res.total} 封 Email`,
      confirmButtonText: '太好了',
      confirmButtonColor: '#457B9D',
    })
    broadcastMessage.value = ''
  } catch (err) {
    console.error('發送公告失敗', err)
    Swal.fire({ icon: 'error', title: '發送失敗', text: '請稍後再試', confirmButtonText: '我知道了' })
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <div class="modal fade" ref="modalRef" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content border-0 shadow-lg rounded-4">

        <div class="modal-header border-bottom-0 pb-2 pt-4 px-4" style="background-color: #FAFAFA;">
          <h5 class="modal-title fw-bold text-dark d-flex align-items-center mb-0">
            <div class="manage-header-icon me-3">
              <i class="bi bi-gear-fill fs-5"></i>
            </div>
            管理揪團
            <span v-if="game" class="text-muted fw-normal ms-2 mt-1" style="font-size: 0.9rem;">
              - {{ cardTitle }}
            </span>
          </h5>
          <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="px-4 pt-3 pb-2" v-if="game" style="background-color: #FAFAFA;">
          <div class="card bg-white border-0 rounded-3 p-3 mb-0 shadow-sm">
            <div class="d-flex flex-wrap gap-3 align-items-center text-secondary small fw-medium">
              <span><i class="bi bi-calendar-event me-1 text-mori-teal"></i> {{ game.gameDate }}</span>
              <span><i class="bi bi-clock me-1 text-mori-teal"></i> {{ game.startTime }} - {{ game.endTime }}</span>
              <span>
                <i class="bi bi-geo-alt me-1 text-mori-teal"></i>
                {{ game.court?.venue?.venueName || '未指定場館' }} · {{ game.court?.courtName || '未指定場地' }}
              </span>
              <span class="badge bg-light text-secondary border rounded-pill">{{ displayLevel }}</span>
              <span v-if="game.status === 'OPEN'" class="badge bg-mori-success-subtle text-mori-success rounded-pill">報名中</span>
              <span v-else-if="game.status === 'CLOSED'" class="badge bg-mori-warning-subtle text-mori-warning rounded-pill">已停止報名</span>
              <span v-else-if="game.status === 'CANCELLED'" class="badge bg-mori-coral-subtle text-mori-coral rounded-pill">已取消</span>
            </div>
          </div>
        </div>

        <div class="px-4 pt-2" style="background-color: #FAFAFA;">
          <ul class="nav nav-tabs border-bottom-0">
            <li class="nav-item">
              <button class="nav-link fw-bold" :class="{ active: activeTab === 'roster' }" @click="activeTab = 'roster'">
                <i class="bi bi-people-fill me-1"></i> 報名名單
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold" :class="{ active: activeTab === 'broadcast' }" @click="activeTab = 'broadcast'">
                <i class="bi bi-megaphone-fill me-1"></i> 群發公告
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold" :class="{ active: activeTab === 'status' }" @click="activeTab = 'status'">
                <i class="bi bi-shield-exclamation me-1"></i> 活動狀態
              </button>
            </li>
          </ul>
        </div>

        <div class="modal-body px-4 pt-4 pb-4">

          <div v-show="activeTab === 'roster'">
            <div class="manage-list-card">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <span class="fw-bold text-dark fs-6">
                  <i class="bi bi-person-check me-1 text-mori-teal"></i> 報名進度
                </span>
                <span class="fw-bold fs-5">
                  <span class="text-mori-teal">{{ game?.currentPlayers || 0 }}</span>
                  <span class="text-muted">/{{ game?.maxPlayers || 0 }} 人</span>
                </span>
              </div>

              <div class="progress mb-4 rounded-pill bg-light" style="height: 8px;">
                <div class="progress-bar bg-mori-teal rounded-pill" role="progressbar"
                     :style="{ width: game?.maxPlayers ? ((game.currentPlayers / game.maxPlayers) * 100) + '%' : '0%' }"></div>
              </div>

              <div v-if="rosterLoading" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm me-2 text-mori-teal"></div>載入中...
              </div>

              <div v-else-if="roster.length === 0" class="text-center py-5 text-muted bg-light rounded-3">
                <i class="bi bi-inbox fs-1 d-block mb-2 opacity-25"></i>目前還沒有人報名
              </div>

             <ul v-else class="list-group list-group-flush">
                <li v-for="(signup, idx) in roster" :key="signup.signupId"
                    class="list-group-item participant-item px-2 py-3 d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center gap-3">
                    <span class="text-muted fw-bold" style="width: 24px; font-size: 0.8rem;">#{{ idx + 1 }}</span>
                    <img :src="signup.member?.photoUrl || `https://i.pravatar.cc/150?u=${signup.member?.memberId}`"
                         class="rounded-circle shadow-sm" width="40" height="40" alt="avatar" style="border: 2px solid #fff; object-fit: cover;">
                    <div>
                      <div class="fw-bold text-dark mb-1" style="font-size: 0.95rem;">{{ signup.member?.fullName || '球友' }}</div>
                      <div class="text-secondary" style="font-size: 0.75rem;">
                        <i class="bi bi-telephone-fill me-1 opacity-75"></i>{{ formatPhone(signup.member?.phone) }}
                      </div>
                    </div>
                  </div>

                  <div class="d-flex align-items-center gap-4">
                    <div class="form-check form-switch mb-0 d-flex align-items-center">
                      <input class="form-check-input shadow-none mt-0" type="checkbox"
                             :id="`paid-${signup.signupId}`" :checked="signup.paid" @change="togglePayment(signup)" style="width: 40px; height: 20px; cursor: pointer;">
                      <label class="form-check-label small fw-bold ms-2" :class="signup.paid ? 'text-mori-success' : 'text-muted'" :for="`paid-${signup.signupId}`" style="cursor: pointer; min-width: 45px;">
                        {{ signup.paid ? '已付款' : '未付款' }}
                      </label>
                    </div>

                    <button
                      class="btn btn-sm btn-outline-danger rounded-circle d-flex align-items-center justify-content-center shadow-sm kick-btn"
                      style="width: 32px; height: 32px; border-width: 1.5px;"
                      title="踢除此成員"
                      @click="removePlayer(signup)"
                    >
                      <i class="bi bi-person-x-fill"></i>
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div v-show="activeTab === 'status'">
            <div class="card border rounded-4 mb-4 shadow-sm border-0 bg-white">
              <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="fw-bold text-dark mb-2"><i class="bi bi-door-open-fill me-2 text-mori-teal"></i>報名開關</h6>
                    <p class="text-secondary small mb-0">{{ game?.status === 'OPEN' ? '目前開放報名中，球友可以自由加入。' : '報名已關閉，不再接受新的報名。' }}</p>
                  </div>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input shadow-none mt-0" type="checkbox" :checked="game?.status === 'OPEN'" @change="toggleStatus" :disabled="game?.status === 'CANCELLED'" style="width: 48px; height: 24px; cursor: pointer;">
                    <label class="form-check-label fw-bold ms-2 mt-1" :class="game?.status === 'OPEN' ? 'text-mori-success' : 'text-mori-warning'">{{ game?.status === 'OPEN' ? '開放報名' : '停止報名' }}</label>
                  </div>
                </div>
              </div>
            </div>

            <div class="card rounded-4 border-0" style="background-color: #FFF5F5;">
              <div class="card-body p-4">
                <h6 class="fw-bold text-mori-coral mb-2"><i class="bi bi-exclamation-triangle-fill me-2"></i>危險操作區</h6>
                <p class="text-secondary small mb-4">取消後所有報名資料將保留，但狀態會變為「已取消」，且無法復原。</p>
                <button class="btn btn-mori-cancel w-100 fw-bold rounded-pill py-2 shadow-sm" @click="cancelGame" :disabled="game?.status === 'CANCELLED'">
                  <i class="bi bi-trash3-fill me-1"></i>{{ game?.status === 'CANCELLED' ? '此揪團已取消' : '取消本次揪團' }}
                </button>
              </div>
            </div>
          </div>

          <div v-show="activeTab === 'broadcast'">
            <div class="card border-0 rounded-4 shadow-sm bg-white">
              <div class="card-body p-4">
                <h6 class="fw-bold text-dark mb-2"><i class="bi bi-megaphone-fill me-2 text-mori-teal"></i>群發 Email 公告</h6>
                <p class="text-secondary small mb-3">輸入公告內容後，系統會自動寄送 Email 給所有已報名成功的球友。</p>
                <textarea v-model="broadcastMessage" class="form-control bg-light shadow-none border-0 mb-4 p-3 rounded-3" rows="5" placeholder="例如：今天場地臨時改到 B 館，請大家留意哦！" style="resize: vertical;" :disabled="isSending"></textarea>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-secondary small"><i class="bi bi-info-circle-fill me-1 opacity-50"></i>將寄送至所有報名球友信箱</span>
                  <button class="btn btn-mori-primary rounded-pill fw-bold px-4 shadow-sm" :disabled="isSending || !broadcastMessage.trim()" @click="sendBroadcast">
                    <span v-if="isSending" class="spinner-border spinner-border-sm me-1"></span>
                    <i v-else class="bi bi-send-fill me-1"></i>{{ isSending ? '發送中...' : '發送公告' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-center pt-4 mt-4">
            <button
              type="button"
              class="btn rounded-pill px-5 fw-bold btn-detail-mori shadow-sm"
              @click="goToDetailPage">
              <i class="bi bi-arrow-up-right-square-fill me-2 text-mori-teal"></i> 查看本團完整詳情頁面
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   🎨 森系清新風 - 管理揪團專屬樣式
   ============================================================ */
.text-mori-teal { color: #457B9D !important; }
.text-mori-coral { color: #E07A5F !important; }
.text-mori-success { color: #2A9D8F !important; }
.text-mori-warning { color: #D97706 !important; }

.bg-mori-teal { background-color: #457B9D !important; }
.bg-mori-success-subtle { background-color: #E6F5F3 !important; }
.bg-mori-warning-subtle { background-color: #FFFBEB !important; }
.bg-mori-coral-subtle { background-color: #FFF0F0 !important; }

/* 標題圖示背景 */
.manage-header-icon {
  color: #457B9D;
  background-color: #E8F1F5;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 報名列表區塊卡片 */
.manage-list-card {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(69, 123, 157, 0.06);
  border: 1px solid #F8FAFC;
}

/* 成員列樣式 */
.participant-item {
  border-color: #F1F5F9;
  background-color: transparent;
}
.participant-item:last-child {
  border-bottom: none;
}

/* 底部跳轉按鈕 (棉麻米白) */
.btn-detail-mori {
  border: 1px solid #E2E8F0;
  font-size: 0.95rem;
  background-color: #ffffff !important;
  color: #475569 !important;
  transition: all 0.2s ease;
}
.btn-detail-mori:hover {
  background-color: #F8FAFC !important;
  color: #0F172A !important;
  border-color: #CBD5E1;
  transform: translateY(-2px);
}

/* 頁籤啟用態 (森藍綠) */
.nav-tabs .nav-link {
  color: #94A3B8;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 12px 20px;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.nav-tabs .nav-link:hover {
  color: #457B9D;
  background-color: transparent;
  border-color: transparent;
}
.nav-tabs .nav-link.active {
  color: #457B9D;
  background: transparent;
  border-bottom: 3px solid #457B9D;
}

/* Toggle 開關綠色態 (森系薄荷綠) */
.form-check-input:checked {
  background-color: #2A9D8F;
  border-color: #2A9D8F;
}

/* 取消揪團按鈕 (珊瑚紅) */
.btn-mori-cancel {
  background-color: #ffffff !important;
  color: #E07A5F !important;
  border: 1px solid #FECDD3 !important;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-mori-cancel:hover:not(:disabled) {
  background-color: #E07A5F !important;
  color: #ffffff !important;
}
.btn-mori-cancel:disabled {
  opacity: 0.6;
}

/* 發送公告按鈕 (森藍綠) */
.btn-mori-primary {
  background-color: #457B9D;
  color: white;
  border: none;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-mori-primary:hover:not(:disabled) {
  background-color: #386785;
  transform: translateY(-1px);
}
/* 🌟 踢除按鈕特效 */
.kick-btn {
  color: #E07A5F;
  border-color: #F4D3C9;
  background-color: #FFF;
  transition: all 0.2s ease;
}
.kick-btn:hover {
  background-color: #E07A5F;
  color: #FFF;
  border-color: #E07A5F;
  transform: scale(1.05);
}
</style>
