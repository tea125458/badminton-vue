<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import * as bootstrap from 'bootstrap'
import { usePickupGameApi } from '@/composables/usePickupGameApi'

const emit = defineEmits(['refresh-list'])

const { newGame, courts, fetchCourts, createPickupGame } = usePickupGameApi()

const minDate = new Date().toISOString().split('T')[0]

// 工具函式
const generateTimeList = (start, end) => {
  const list = []
  for (let i = start; i <= end; i++) {
    list.push(`${i.toString().padStart(2, '0')}:00`)
  }
  return list
}

// 🌟 開始時間動態計算 (10:00 ~ 21:00)
const startTimeOptions = computed(() => {
  if (!newGame.value.gameDate) return []
  
  let startHour = 10
  // 規則 3：如果選的是今天，過濾掉過去的小時
  if (newGame.value.gameDate === minDate) {
    const currentHour = new Date().getHours()
    if (currentHour + 1 > startHour) {
      startHour = currentHour + 1
    }
  }
  
  if (startHour > 21) return [] // 如果今天已經超過 21:00，就沒時間可選了
  return generateTimeList(startHour, 21)
})

// 🌟 結束時間動態計算 (必須大於開始時間，最晚 22:00)
const endTimeOptions = computed(() => {
  if (!newGame.value.startTime) return []
  const startHour = parseInt(newGame.value.startTime.split(':')[0])
  return generateTimeList(startHour + 1, 22)
})

// 🌟 狀態重置 Watchers
// 監聽「日期」：若改變，清空開始與結束時間
watch(() => newGame.value.gameDate, (newVal, oldVal) => {
  if (newVal && oldVal && newVal !== oldVal) {
    newGame.value.startTime = ''
    newGame.value.endTime = ''
  }
})

// 監聽「開始時間」：若改變，清空結束時間
watch(() => newGame.value.startTime, (newVal, oldVal) => {
  if (newVal && oldVal && newVal !== oldVal) {
    newGame.value.endTime = ''
  }
})

const modalRef = ref(null)
let modalInstance = null

onMounted(() => {
  fetchCourts()
  modalInstance = new bootstrap.Modal(modalRef.value)
  
  newGame.value.gameDate = minDate
  newGame.value.startTime = ''
  newGame.value.endTime = ''
  newGame.value.maxPlayers = 6
  newGame.value.skillLevel = 'ALL'
})

const showModal = () => modalInstance.show()
defineExpose({ showModal })

const submitForm = async () => {
  newGame.value.host.memberId = 1 
  await createPickupGame()
  modalInstance.hide()
  emit('refresh-list')
}
</script>

<template>
  <div class="modal fade" ref="modalRef" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg rounded-4">
        
        <div class="modal-header border-bottom-0 bg-light rounded-top-4 pb-2 pt-3 px-4">
          <h5 class="modal-title fw-bold text-dark d-flex align-items-center">
            <i class="bi bi-plus-circle-fill text-sky-blue me-2 fs-4"></i> 發起揪團
          </h5>
          <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body px-4 pt-3 pb-4">
          <form @submit.prevent="submitForm">
            
            <div class="mb-4">
              <label class="form-label fw-bold text-secondary small mb-1">打球地點</label>
              <div class="input-group">
                <span class="input-group-text bg-white text-muted border-end-0"><i class="bi bi-geo-alt"></i></span>
                <select class="form-select border-start-0 ps-0 shadow-none" v-model="newGame.court.courtId" required>
                  <option value="" disabled>請選擇場館與場地...</option>
                  <option v-for="court in courts" :key="court.courtId" :value="court.courtId">
                    {{ court.venue.venueName }} - {{ court.courtName }}
                  </option>
                </select>
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label fw-bold text-secondary small mb-1">揪團日期</label>
              <div class="input-group">
                <span class="input-group-text bg-white text-muted border-end-0"><i class="bi bi-calendar-event"></i></span>
                <input type="date" class="form-control border-start-0 ps-0 shadow-none" v-model="newGame.gameDate" :min="minDate" required>
              </div>
            </div>

            <div class="row mb-4">
              <div class="col-6">
                <label class="form-label fw-bold text-secondary small mb-1">開始時間</label>
                <select class="form-select shadow-none" v-model="newGame.startTime" :disabled="!newGame.gameDate || startTimeOptions.length === 0" required>
                  <option value="" disabled>{{ startTimeOptions.length === 0 ? '今日已無時段' : '請選擇...' }}</option>
                  <option v-for="t in startTimeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label fw-bold text-secondary small mb-1">結束時間</label>
                <select class="form-select shadow-none" v-model="newGame.endTime" :disabled="!newGame.startTime" required>
                  <option value="" disabled>請先選擇開始時間</option>
                  <option v-for="t in endTimeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>

            <div class="row mb-4">
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

            <button type="submit" class="btn w-100 rounded-pill fw-bold text-white py-2 shadow-sm btn-sky-blue">
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
</style>
