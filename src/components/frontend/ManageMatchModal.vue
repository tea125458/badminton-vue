<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as bootstrap from 'bootstrap'
import api from '@/api'
import Swal from 'sweetalert2'

const props = defineProps({
  game: { type: Object, default: null }
})
const emit = defineEmits(['refresh-list'])

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

// ============================
// 🏷️ 頁籤切換
// ============================
const activeTab = ref('roster') // 'roster' | 'status'

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
  // 未來如果有 API 可以在這裡呼叫
  // await axios.put(`/api/pickup-game-signups/${signup.signupId}`, { paid: signup.paid })
}

// 移除球友
const removePlayer = async (signup) => {
  const result = await Swal.fire({
    icon: 'warning',
    title: '確定移除此球友？',
    text: `即將移除「${signup.member?.fullName || '球友'}」的報名`,
    showCancelButton: true,
    confirmButtonText: '確定移除',
    cancelButtonText: '取消',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
  })
  if (result.isConfirmed) {
    try {
      await api.delete(`/pickup-game-signups/${signup.signupId}`)
      Swal.fire({
        icon: 'success',
        title: '已移除',
        text: `${signup.member?.fullName || '球友'} 的報名已被移除`,
        confirmButtonText: '好的',
        confirmButtonColor: '#0ea5e9',
        timer: 1500
      })
      await fetchRoster()
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
  // 將 0912345678 格式化為 0912-345-678
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
  set: () => {} // 由 toggleStatus 處理
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
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
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
        confirmButtonColor: '#0ea5e9',
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

// 當 game 改變時重新撈名單
watch(() => props.game?.gameId, (newId) => {
  if (newId) fetchRoster()
})

// ============================
// 📢 頁籤 3：群發公告 (Broadcast)
// ============================
const broadcastMessage = ref('')
const isSending = ref(false)

const sendBroadcast = async () => {
  // 防呆：確認訊息不為空
  if (!broadcastMessage.value.trim()) {
    Swal.fire({ icon: 'warning', title: '請輸入公告內容', confirmButtonText: '好的' })
    return
  }
  // 二次確認
  const confirm = await Swal.fire({
    icon: 'question',
    title: '確定要發送公告嗎？',
    text: '系統將發送 Email 給所有已報名的球友',
    showCancelButton: true,
    confirmButtonText: '確定發送',
    cancelButtonText: '取消',
    confirmButtonColor: '#0ea5e9',
  })
  if (!confirm.isConfirmed) return

  isSending.value = true
  try {
    const res = await api.post(`/pickup-games/${props.game.gameId}/broadcast`, {
      message: broadcastMessage.value.trim()
    })
    const data = res
    Swal.fire({
      icon: 'success',
      title: '公告已發送！',
      text: `成功寄出 ${data.sent} / ${data.total} 封 Email`,
      confirmButtonText: '太好了',
      confirmButtonColor: '#0ea5e9',
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

        <!-- ▌Modal Header -->
        <div class="modal-header border-bottom-0 bg-light rounded-top-4 pb-2 pt-3 px-4">
          <h5 class="modal-title fw-bold text-dark d-flex align-items-center">
            <i class="bi bi-gear-fill text-secondary me-2 fs-5"></i>
            管理揪團
            <span v-if="game" class="text-muted fw-normal ms-2" style="font-size: 0.85rem;">
              - {{ cardTitle }}
            </span>
          </h5>
          <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <!-- ▌活動摘要卡片 -->
        <div class="px-4 pt-3" v-if="game">
          <div class="card bg-light border-0 rounded-3 p-3 mb-0">
            <div class="d-flex flex-wrap gap-3 align-items-center text-secondary small fw-medium">
              <span><i class="bi bi-calendar-event me-1 text-primary"></i> {{ game.gameDate }}</span>
              <span><i class="bi bi-clock me-1 text-primary"></i> {{ game.startTime }} - {{ game.endTime }}</span>
              <span>
                <i class="bi bi-geo-alt me-1 text-primary"></i>
                {{ game.court?.venue?.venueName || '未指定場館' }} · {{ game.court?.courtName || '未指定場地' }}
              </span>
              <span class="badge bg-light text-secondary border rounded-pill">{{ displayLevel }}</span>
              <span v-if="game.status === 'OPEN'" class="badge bg-success-subtle text-success rounded-pill">報名中</span>
              <span v-else-if="game.status === 'CLOSED'" class="badge bg-warning-subtle text-warning rounded-pill">已停止報名</span>
              <span v-else-if="game.status === 'CANCELLED'" class="badge bg-danger-subtle text-danger rounded-pill">已取消</span>
            </div>
          </div>
        </div>

        <!-- ▌頁籤 (nav-tabs) -->
        <div class="px-4 pt-3">
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

        <!-- ▌Modal Body -->
        <div class="modal-body px-4 pt-3 pb-4">

          <!-- ============================================ -->
          <!-- 📋 頁籤 1：報名名單 (Roster)                -->
          <!-- ============================================ -->
          <div v-show="activeTab === 'roster'">

            <!-- 頂部進度 -->
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="fw-bold text-dark">
                <i class="bi bi-person-check me-1 text-primary"></i> 報名進度
              </span>
              <span class="fw-bold fs-5">
                <span class="text-primary">{{ game?.currentPlayers || 0 }}</span>
                <span class="text-muted">/{{ game?.maxPlayers || 0 }} 人</span>
              </span>
            </div>

            <!-- 進度條 -->
            <div class="progress mb-4 rounded-pill" style="height: 6px;">
              <div class="progress-bar bg-primary rounded-pill" role="progressbar"
                   :style="{ width: game?.maxPlayers ? ((game.currentPlayers / game.maxPlayers) * 100) + '%' : '0%' }"></div>
            </div>

            <!-- Loading -->
            <div v-if="rosterLoading" class="text-center py-4 text-muted">
              <div class="spinner-border spinner-border-sm me-2"></div>
              載入中...
            </div>

            <!-- 空名單 -->
            <div v-else-if="roster.length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
              目前還沒有人報名
            </div>

            <!-- 名單列表 -->
            <ul v-else class="list-group list-group-flush">
              <li v-for="(signup, idx) in roster" :key="signup.signupId"
                  class="list-group-item px-0 py-3 d-flex align-items-center justify-content-between">
                
                <!-- 左側：序號 + 頭像 + 姓名/電話 -->
                <div class="d-flex align-items-center gap-3">
                  <span class="text-muted fw-bold" style="width: 24px; font-size: 0.8rem;">
                    #{{ idx + 1 }}
                  </span>
                  <img :src="signup.member?.photoUrl || `https://i.pravatar.cc/150?u=${signup.member?.memberId}`"
                       class="rounded-circle" width="36" height="36" alt="avatar"
                       style="border: 2px solid #e2e8f0; object-fit: cover;">
                  <div>
                    <div class="fw-bold text-dark small">{{ signup.member?.fullName || '球友' }}</div>
                    <div class="text-muted" style="font-size: 0.72rem;">
                      <i class="bi bi-telephone me-1"></i>
                      {{ formatPhone(signup.member?.phone) }}
                    </div>
                  </div>
                </div>

                <!-- 右側：已付款 Toggle + 移除按鈕 -->
                <div class="d-flex align-items-center gap-3">
                  <!-- 已付款 Toggle -->
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input shadow-none" type="checkbox"
                           :id="`paid-${signup.signupId}`"
                           :checked="signup.paid"
                           @change="togglePayment(signup)"
                           style="width: 40px; height: 20px; cursor: pointer;">
                    <label class="form-check-label small fw-medium ms-1"
                           :class="signup.paid ? 'text-success' : 'text-muted'"
                           :for="`paid-${signup.signupId}`"
                           style="cursor: pointer;">
                      {{ signup.paid ? '已付款' : '未付款' }}
                    </label>
                  </div>

                  <!-- 移除按鈕 -->
                  <button class="btn btn-sm text-danger fw-bold px-0" 
                          style="font-size: 0.78rem;"
                          @click="removePlayer(signup)">
                    <i class="bi bi-x-circle me-1"></i>移除
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- ============================================ -->
          <!-- ⚙️ 頁籤 2：活動狀態 (Status & Danger Zone) -->
          <!-- ============================================ -->
          <div v-show="activeTab === 'status'">
            
            <!-- 上半部：報名狀態控制 -->
            <div class="card border rounded-3 mb-4">
              <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="fw-bold text-dark mb-1">
                      <i class="bi bi-door-open me-1 text-primary"></i>
                      報名開關
                    </h6>
                    <p class="text-muted small mb-0">
                      {{ game?.status === 'OPEN' ? '目前開放報名中，球友可以自由加入。' : '報名已關閉，不再接受新的報名。' }}
                    </p>
                  </div>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input shadow-none" type="checkbox"
                           :checked="game?.status === 'OPEN'"
                           @change="toggleStatus"
                           :disabled="game?.status === 'CANCELLED'"
                           style="width: 48px; height: 24px; cursor: pointer;">
                    <label class="form-check-label fw-bold ms-2"
                           :class="game?.status === 'OPEN' ? 'text-success' : 'text-warning'">
                      {{ game?.status === 'OPEN' ? '開放報名' : '停止報名' }}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- 下半部：Danger Zone -->
            <div class="card border-danger rounded-3">
              <div class="card-body p-4">
                <h6 class="fw-bold text-danger mb-2">
                  <i class="bi bi-exclamation-triangle-fill me-1"></i> 危險操作區
                </h6>
                <p class="text-muted small mb-3">
                  取消後所有報名資料將保留，但狀態會變為「已取消」，且無法復原。
                </p>
                <button class="btn btn-danger w-100 fw-bold rounded-pill py-2"
                        @click="cancelGame"
                        :disabled="game?.status === 'CANCELLED'">
                  <i class="bi bi-trash3-fill me-1"></i>
                  {{ game?.status === 'CANCELLED' ? '此揪團已取消' : '取消本次揪團' }}
                </button>
              </div>
            </div>

          </div>

          <!-- ============================================ -->
          <!-- 📢 頁籤 3：群發公告 (Broadcast)               -->
          <!-- ============================================ -->
          <div v-show="activeTab === 'broadcast'">
            <div class="card border rounded-3">
              <div class="card-body p-4">
                <h6 class="fw-bold text-dark mb-1">
                  <i class="bi bi-megaphone me-1 text-primary"></i>
                  群發 Email 公告
                </h6>
                <p class="text-muted small mb-3">
                  輸入公告內容後，系統會自動寄送 Email 給所有已報名成功的球友。
                </p>
                <textarea 
                  v-model="broadcastMessage" 
                  class="form-control shadow-none mb-3" 
                  rows="5" 
                  placeholder="例如：今天有事延後 30 分鐘開始，請大家留意時間嗡！"
                  style="resize: vertical; border-color: #dee2e6;"
                  :disabled="isSending"
                ></textarea>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-muted small">
                    <i class="bi bi-info-circle me-1"></i>
                    將寄送至所有報名球友的 Email 信箱
                  </span>
                  <button class="btn btn-primary rounded-pill fw-bold px-4"
                          :disabled="isSending || !broadcastMessage.trim()"
                          @click="sendBroadcast">
                    <span v-if="isSending" class="spinner-border spinner-border-sm me-1"></span>
                    <i v-else class="bi bi-send-fill me-1"></i>
                    {{ isSending ? '發送中...' : '發送公告' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
<style scoped>
/* 頁籤啟用態 */
.nav-tabs .nav-link {
  color: #6c757d;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 8px 16px;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.nav-tabs .nav-link:hover {
  color: #0ea5e9;
  border-color: transparent;
}
.nav-tabs .nav-link.active {
  color: #0ea5e9;
  background: transparent;
  border-bottom: 2px solid #0ea5e9;
}

/* Toggle 開關綠色態 */
.form-check-input:checked {
  background-color: #22c55e;
  border-color: #22c55e;
}

/* 名單列分隔線 */
.list-group-item {
  border-color: #f1f5f9;
}
.list-group-item:last-child {
  border-bottom: none;
}

/* Danger Zone 邊框 */
.border-danger {
  border-color: #fca5a5 !important;
}
</style>
