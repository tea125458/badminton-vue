<script setup>
import { ref, onMounted } from 'vue'
import { venueApi } from '@/api/venue'
import { courtApi } from '@/api/court'

// ========== 資料狀態 ==========
const courts = ref([]) //球場列表
const venues = ref([]) // 場館列表（給下拉選單用
const loading = ref(true) //載入中
const errorMsg = ref('') //錯誤訊息

// ========== 頁面載入時呼叫 ==========
onMounted(() => {
  loadData()
})

// ========== 載入所有資料 ==========
async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    courts.value = await courtApi.findAll()
    venues.value = await venueApi.findAll()
  } catch (error) {
    errorMsg.value = '載入失敗:' + error.message
  } finally {
    loading.value = false
  }
}

// ========== 狀態顯示 ==========
function statusText(status) {
  const map = { ACTIVE: '營業中', INACTIVE: '已停用', MAINTENANCE: '整修中' }
  return map[status] || status
}

function statusClass(status) {
  const map = {
    ACTIVE: 'bg-success',
    INACTIVE: 'bg-secondary',
    MAINTENANCE: 'bg-warning text-dark',
  }
  return map[status] || 'bg-secondary'
}

// ========== 刪除球場 ==========
async function deleteCourt(court) {
  if (!confirm(`確定要刪除「${court.courtName}」嗎？`)) return

  try {
    await courtApi.delete(court.courtId)
    alert('刪除成功!')
    loadData()
  } catch (error) {
    alert('刪除失敗:' + error.message)
  }
}

// ========== 變更狀態 ==========
async function changeStatus(id, newStatus) {
  try {
    await courtApi.updateStatus(id, newStatus)
    loadData()
  } catch (error) {
    alert('狀態更新失敗:' + error.message)
  }
}

// ========== Modal 控制 ==========
const showModal = ref(false)
const modalTitle = ref('新增球場')
const editId = ref(null)

// 表單欄位（注意：比 Venue 多了 venue 欄位）
const form = ref({
  courtName: '',
  venue: { venueId: '' },
})

// 打開新增 Modal
function openCreateModal() {
  modalTitle.value = '新增球場'
  editId.value = null
  form.value = { courtName: '', venue: { venueId: '' } }
  showModal.value = true
}

// 打開編輯 Modal（帶入舊資料）
function openEditModal(court) {
  modalTitle.value = '編輯球場'
  editId.value = court.courtId
  form.value = {
    courtName: court.courtName,
    venue: { venueId: court.venue?.venueId || '' },
  }
  showModal.value = true
}

// 儲存（根據有無 editId 判斷新增或更新）
async function saveCourt() {
  if (!form.value.courtName.trim()) {
    alert('請輸入球場名稱!')
    return
  }
  if (!form.value.venue.venueId) {
    alert('請選擇所屬場館!')
    return
  }

  try {
    if (editId.value) {
      await courtApi.update(editId.value, form.value)
    } else {
      await courtApi.create(form.value)
    }
    showModal.value = false
    alert(editId.value ? '更新成功' : '新增成功')
    loadData()
  } catch (error) {
    alert('操作失敗:' + error.message)
  }
}
</script>

<template>
  <!-- 頁面標題 + 新增按鈕 -->
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h2 class="fw-bold mb-0" style="font-size: 1.5rem">
      <span class="me-2" style="font-size: 1.3rem">🏸</span>球場管理
    </h2>
    <button class="btn btn-primary" @click="openCreateModal">
      <i class="bi bi-plus-lg me-1"></i>新增球場
    </button>
  </div>

  <!-- 球場資料表格 -->
  <div class="card card-rounded shadow-sm border-0">
    <div class="card-body p-0">
      <table class="table table-hover mb-0">
        <thead>
          <tr style="background: var(--brand-dark); color: white">
            <th class="ps-4">ID</th>
            <th>球場名稱</th>
            <th>所屬場館</th>
            <th>狀態</th>
            <th style="width: 200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 載入中 -->
          <tr v-if="loading">
            <td colspan="5" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary me-2"></div>
              載入中...
            </td>
          </tr>
          <!-- 載入錯誤 -->
          <tr v-else-if="errorMsg">
            <td colspan="5" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              <br />
              <button class="btn btn-sm btn-outline-primary mt-2" @click="loadData">重試</button>
            </td>
          </tr>
          <!-- 無資料 -->
          <tr v-else-if="courts.length === 0">
            <td colspan="5" class="text-center text-muted py-4">
              目前沒有球場資料，請點擊「新增球場」按鈕
            </td>
          </tr>

          <!-- 正常渲染資料 -->
          <tr v-for="court in courts" :key="court.courtId" v-else>
            <td class="ps-4">{{ court.courtId }}</td>
            <td>
              <strong>{{ court.courtName }}</strong>
            </td>
            <td>{{ court.venue?.venueName || '-' }}</td>
            <td>
              <span class="badge" :class="statusClass(court.status)">
                {{ statusText(court.status) }}
              </span>
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" title="編輯" @click="openEditModal(court)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" title="刪除" @click="deleteCourt(court)">
                  <i class="bi bi-trash"></i>
                </button>
                <div class="btn-group btn-group-sm">
                  <button
                    class="btn btn-outline-secondary dropdown-toggle"
                    data-bs-toggle="dropdown"
                    title="變更狀態"
                  >
                    <i class="bi bi-arrow-repeat"></i>
                  </button>
                  <ul class="dropdown-menu">
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(court.courtId, 'ACTIVE')"
                      >
                        <i class="bi bi-check-circle text-success me-1"></i>營業中
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(court.courtId, 'MAINTENANCE')"
                      >
                        <i class="bi bi-tools text-warning me-1"></i>整修中
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(court.courtId, 'INACTIVE')"
                      >
                        <i class="bi bi-x-circle text-danger me-1"></i>停用
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <!-- 新增/編輯 Modal -->
  <div v-if="showModal" class="modal-backdrop fade show" @click="showModal = false"></div>
  <div v-if="showModal" class="modal fade show d-block" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ modalTitle }}</h5>
          <button type="button" class="btn-close" @click="showModal = false"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">球場名稱<span class="text-danger">*</span></label>
            <input
              type="text"
              class="form-control"
              v-model="form.courtName"
              placeholder="例:A1號場"
            />
          </div>
          <div class="mb-3">
            <label class="form-label">所屬場館<span class="text-danger">*</span></label>
            <select class="form-select" v-model="form.venue.venueId">
              <option value="" disabled>請選擇場館</option>
              <option v-for="v in venues" :key="v.venueId" :value="v.venueId">
                {{ v.venueName }}
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
          <button type="button" class="btn btn-primary" @click="saveCourt">
            <i class="bi bi-check-lg me-1"></i>儲存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
