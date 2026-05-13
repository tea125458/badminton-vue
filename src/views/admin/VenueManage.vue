<script setup>
import { ref, onMounted } from 'vue'
import { venueApi } from '@/api/venue'

// ========== 資料狀態 ==========
const venues = ref([]) //場館列表
const loading = ref(true) //是否正在載入
const errorMsg = ref('') //錯誤訊息

// ========== 頁面載入時呼叫 ==========
onMounted(() => {
  loadData()
})

// ========== 載入所有場館 ==========
async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
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

// ========== 刪除場館 ==========
async function deleteVenue(venue) {
  if (!confirm(`確定要刪除「${venue.venueName}」嗎？`)) return

  try {
    await venueApi.delete(venue.venueId)
    alert('刪除成功')
    loadData() //重新載入
  } catch (error) {
    alert('刪除失敗:' + error.message)
  }
}

// ========== 變更狀態 ==========
async function changeStatus(id, newStatus) {
  try {
    await venueApi.updateStatus(id, newStatus)
    loadData() //重新載入
  } catch (error) {
    alert('狀態更新失敗:' + error.message)
  }
}

// ========== Modal 控制 ==========
const showModal = ref(false)
const modalTitle = ref('新增場館')
const editId = ref(null)

// 表單欄位
const form = ref({
  venueName: '',
  address: '',
  phone: '',
})

// 打開新增 Modal
function openCreateModal() {
  modalTitle.value = '新增場館'
  editId.value = null
  form.value = { venueName: '', address: '', phone: '' }
  showModal.value = true
}

// 打開編輯 Modal（帶入舊資料）
function openEditModal(venue) {
  modalTitle.value = '編輯場館'
  editId.value = venue.venueId
  form.value = {
    venueName: venue.venueName,
    address: venue.address || '',
    phone: venue.phone || '',
  }
  showModal.value = true
}

// 儲存（根據有無 editId 判斷新增或更新）
async function saveVenue() {
  if (!form.value.venueName.trim()) {
    alert('請輸入場館名稱!')
    return
  }

  try {
    if (editId.value) {
      await venueApi.update(editId.value, form.value)
    } else {
      await venueApi.create(form.value)
    }
    showModal.value = false
    alert(editId.value ? '更新成功!' : '新增成功!')
    loadData()
  } catch (error) {
    alert('操作失敗：' + error.message)
  }
}
</script>

<template>
  <!-- 頁面標題 + 新增按鈕 -->
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h2 class="fw-bold mb-0" style="font-size: 1.5rem">
      <i class="bi bi-building me-2" style="color: var(--brand-sky)"></i>場館管理
    </h2>
    <button class="btn btn-primary" @click="openCreateModal">
      <i class="bi bi-plus-lg me-1"></i>新增場館
    </button>
  </div>

  <!-- 場館資料表格 -->
  <div class="card card-rounded shadow-sm border-0">
    <div class="card-body p-0">
      <table class="table table-hover mb-0">
        <thead>
          <tr style="background: var(--brand-dark); color: white">
            <th class="ps-4">ID</th>
            <th>場館名稱</th>
            <th>地址</th>
            <th>電話</th>
            <th>狀態</th>
            <th style="width: 200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 載入中 -->
          <tr v-if="loading">
            <td colspan="6" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary me-2"></div>
              載入中...
            </td>
          </tr>

          <!-- 載入錯誤 -->
          <tr v-else-if="errorMsg">
            <td colspan="6" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              <br />
              <button class="btn btn-sm btn-outline-primary mt-2" @click="loadData">重試</button>
            </td>
          </tr>

          <!-- 無資料 -->
          <tr v-else-if="venues.length === 0">
            <td colspan="6" class="text-center text-muted py-4">
              目前沒有場館資料，請點擊「新增場館」按鈕
            </td>
          </tr>

          <!-- 正常渲染資料 -->
          <tr v-for="venue in venues" :key="venue.venueId" v-else>
            <td class="ps-4">{{ venue.venueId }}</td>
            <td>
              <strong>{{ venue.venueName }}</strong>
            </td>
            <td>{{ venue.address || '-' }}</td>
            <td>{{ venue.phone || '-' }}</td>
            <td>
              <span class="badge" :class="statusClass(venue.status)">
                {{ statusText(venue.status) }}
              </span>
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" title="編輯" @click="openEditModal(venue)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" title="刪除" @click="deleteVenue(venue)">
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
                        @click.prevent="changeStatus(venue.venueId, 'ACTIVE')"
                      >
                        <i class="bi bi-check-circle text-success me-1"></i>營業中
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(venue.venueId, 'MAINTENANCE')"
                      >
                        <i class="bi bi-tools text-warning me-1"></i>整修中
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(venue.venueId, 'INACTIVE')"
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
            <label class="form-label">場館名稱<span class="text-danger">*</span></label>
            <input
              type="text"
              class="form-control"
              v-model="form.venueName"
              placeholder="例：大安運動中心"
            />
          </div>
          <div class="mb-3">
            <label class="form-label">地址</label>
            <input
              type="text"
              class="form-control"
              v-model="form.address"
              placeholder="例：台北市大安區辛亥路三段382號"
            />
          </div>
          <div class="mb-3">
            <label class="form-label">電話</label>
            <input
              type="text"
              class="form-control"
              v-model="form.phone"
              placeholder="例：02-2733-1369"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
          <button type="button" class="btn btn-primary" @click="saveVenue">
            <i class="bi bi-check-lg me-1"></i>儲存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
