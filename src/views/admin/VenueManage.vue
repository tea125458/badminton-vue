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
    ACTIVE: 'badge-active',
    INACTIVE: 'badge-inactive',
    MAINTENANCE: 'badge-maintenance',
  }
  return map[status] || 'badge-default'
}

// ========== 通知彈窗 ==========
const notifyVisible = ref(false)
const notifyType = ref('success')
const notifyTitle = ref('')
const notifyMessage = ref('')

function showNotify(type, title, message) {
  notifyType.value = type
  notifyTitle.value = title
  notifyMessage.value = message
  notifyVisible.value = true
}

// ========== 確認刪除彈窗 ==========
const confirmDeleteVisible = ref(false)
const pendingDeleteVenue = ref(null)

function requestDelete(venue) {
  pendingDeleteVenue.value = venue
  confirmDeleteVisible.value = true
}

async function confirmDelete() {
  confirmDeleteVisible.value = false
  if (!pendingDeleteVenue.value) return
  try {
    await venueApi.delete(pendingDeleteVenue.value.venueId)
    showNotify('success', '刪除成功', `「${pendingDeleteVenue.value.venueName}」已刪除`)
    loadData()
  } catch (error) {
    showNotify('error', '刪除失敗', error.response?.data?.message || error.message)
  }
  pendingDeleteVenue.value = null
}

// ========== 變更狀態 ==========
async function changeStatus(id, newStatus) {
  try {
    await venueApi.updateStatus(id, newStatus)
    loadData()
  } catch (error) {
    showNotify('error', '狀態更新失敗', error.response?.data?.message || error.message)
  }
}

// ========== Modal 控制 ==========
const showModal = ref(false)
const modalTitle = ref('新增場館')
const editId = ref(null)
const saving = ref(false)

// 圖片上傳狀態
const imageFile = ref(null)
const imagePreview = ref('')

// 表單欄位
const form = ref({
  venueName: '',
  address: '',
  phone: '',
  imageUrl: '',
})

// 圖片選取
function onImageChange(e) {
  const file = e.target.files[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

// 打開新增 Modal
function openCreateModal() {
  modalTitle.value = '新增場館'
  editId.value = null
  form.value = { venueName: '', address: '', phone: '', imageUrl: '' }
  imageFile.value = null
  imagePreview.value = ''
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
    imageUrl: venue.imageUrl || '',
  }
  imageFile.value = null
  // 編輯時顯示現有圖片
  imagePreview.value = venue.imageUrl || ''
  showModal.value = true
}

// 儲存（根據有無 editId 判斷新增或更新）
async function saveVenue() {
  if (!form.value.venueName.trim()) {
    showNotify('warning', '提示', '請輸入場館名稱!')
    return
  }

  saving.value = true
  try {
    // 如果有選擇新圖片，先上傳（並刪除舊圖）
    if (imageFile.value) {
      const res = await venueApi.uploadImage(imageFile.value, form.value.imageUrl)
      form.value.imageUrl = res.imageUrl
    }
    if (editId.value) {
      await venueApi.update(editId.value, form.value)
    } else {
      await venueApi.create(form.value)
    }
    showModal.value = false
    showNotify('success', editId.value ? '更新成功' : '新增成功', editId.value ? '場館資料已更新！' : '場館已成功建立！')
    loadData()
  } catch (error) {
    showNotify('error', '操作失敗', error.response?.data?.message || error.message)
  } finally {
    saving.value = false
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
  <div class="card card-rounded shadow-sm border-0 overflow-hidden">
    <div class="card-body p-0">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th class="ps-4">編號</th>
            <th>圖片</th>
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
            <td colspan="7" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary me-2"></div>
              載入中...
            </td>
          </tr>

          <!-- 載入錯誤 -->
          <tr v-else-if="errorMsg">
            <td colspan="7" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              <br />
              <button class="btn btn-sm btn-outline-primary mt-2" @click="loadData">重試</button>
            </td>
          </tr>

          <!-- 無資料 -->
          <tr v-else-if="venues.length === 0">
            <td colspan="7" class="text-center text-muted py-4">
              目前沒有場館資料，請點擊「新增場館」按鈕
            </td>
          </tr>

          <!-- 正常渲染資料 -->
          <tr v-for="venue in venues" :key="venue.venueId" v-else>
            <td class="ps-4">{{ venue.venueId }}</td>
            <td>
              <img
                v-if="venue.imageUrl"
                :src="
                  venue.imageUrl.startsWith('/') || venue.imageUrl.startsWith('http')
                    ? venue.imageUrl
                    : '/' + venue.imageUrl
                "
                :alt="venue.venueName"
                style="
                  width: 56px;
                  height: 40px;
                  object-fit: cover;
                  border-radius: 0.5rem;
                  border: 1px solid #e2e8f0;
                "
              />
              <span v-else class="text-muted" style="font-size: 0.8rem">無圖片</span>
            </td>
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
              <div class="d-flex gap-1">
                <button class="btn btn-sm action-btn action-btn-edit" title="編輯" @click="openEditModal(venue)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm action-btn action-btn-delete" title="刪除" @click="requestDelete(venue)">
                  <i class="bi bi-trash3"></i>
                </button>
                <div class="dropdown">
                  <button
                    class="btn btn-sm action-btn action-btn-status dropdown-toggle"
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
          <div class="mb-3">
            <label class="form-label">場館圖片</label>
            <div class="venue-upload-area" @click="$refs.venueFileInput.click()">
              <img
                v-if="imagePreview"
                :src="
                  imagePreview.startsWith('blob:') ||
                  imagePreview.startsWith('/') ||
                  imagePreview.startsWith('http')
                    ? imagePreview
                    : '/' + imagePreview
                "
                class="venue-upload-preview"
              />
              <div v-else class="venue-upload-placeholder">
                <i
                  class="bi bi-cloud-arrow-up"
                  style="font-size: 2rem; color: var(--brand-sky)"
                ></i>
                <p class="text-secondary mt-1 mb-0" style="font-size: 0.85rem">點擊上傳場館圖片</p>
              </div>
            </div>
            <input
              ref="venueFileInput"
              type="file"
              accept="image/*"
              class="d-none"
              @change="onImageChange"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="saveVenue">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            {{ saving ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 通知彈窗 -->
  <div v-if="notifyVisible" class="modal-backdrop fade show" style="z-index: 1060" @click="notifyVisible = false"></div>
  <div v-if="notifyVisible" class="modal fade show d-block" tabindex="-1" style="z-index: 1070">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 1rem">
        <div class="modal-body text-center py-4 px-4">
          <div v-if="notifyType === 'success'" class="mb-3">
            <i class="bi bi-check-circle-fill" style="font-size: 3rem; color: #10B981"></i>
          </div>
          <div v-else-if="notifyType === 'error'" class="mb-3">
            <i class="bi bi-x-circle-fill" style="font-size: 3rem; color: #EF4444"></i>
          </div>
          <div v-else class="mb-3">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: #F59E0B"></i>
          </div>
          <h5 class="fw-bold mb-2">{{ notifyTitle }}</h5>
          <p class="text-secondary mb-3" style="font-size: 0.95rem">{{ notifyMessage }}</p>
          <button class="btn btn-primary px-4 rounded-pill" @click="notifyVisible = false">我知道了</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 確認刪除彈窗 -->
  <div v-if="confirmDeleteVisible" class="modal-backdrop fade show" style="z-index: 1060"></div>
  <div v-if="confirmDeleteVisible" class="modal fade show d-block" tabindex="-1" style="z-index: 1070">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 1rem">
        <div class="modal-body text-center py-4 px-4">
          <div class="mb-3">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: #EF4444"></i>
          </div>
          <h5 class="fw-bold mb-2">確認刪除</h5>
          <p class="text-secondary mb-3" style="font-size: 0.95rem">
            確定要刪除「{{ pendingDeleteVenue?.venueName }}」嗎？<br/>此操作無法復原。
          </p>
          <div class="d-flex gap-2 justify-content-center">
            <button class="btn btn-secondary px-3 rounded-pill" @click="confirmDeleteVisible = false">取消</button>
            <button class="btn btn-danger px-3 rounded-pill" @click="confirmDelete">確認刪除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 狀態標籤 ===== */
.badge {
  display: inline-block;
  padding: 0.3rem 0.7rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.badge-active {
  background: #dcfce7;
  color: #16a34a;
}
.badge-inactive {
  background: #f1f5f9;
  color: #64748b;
}
.badge-maintenance {
  background: #fef9c3;
  color: #ca8a04;
}
.badge-default {
  background: #f1f5f9;
  color: #64748b;
}

/* 覆寫圓角 — 與 ProductManage 統一 */
.card-rounded {
  border-radius: 0.75rem !important;
}

/* ===== 表格表頭 ===== */
.table thead th {
  background: #1b4767;
  color: white;
  font-family: 'Inter', 'Noto Sans TC', sans-serif;
  font-size: 1.12rem;
  font-weight: 400;
  letter-spacing: 0.05em;
  white-space: nowrap;
  border: none;
}

.venue-upload-area {
  border: 2px dashed #e2e8f0;
  border-radius: 1rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.venue-upload-area:hover {
  border-color: var(--brand-sky);
  background: #f0f9ff;
}

.venue-upload-preview {
  max-height: 160px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 0.75rem;
}

.venue-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ===== 操作按鈕 ===== */
.action-btn {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.action-btn-edit {
  background: #eef2ff;
  color: #6366f1;
  border: 1px solid #c7d2fe;
}
.action-btn-edit:hover {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}
.action-btn-delete {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
}
.action-btn-delete:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}
.action-btn-status {
  background: #f0f9ff;
  color: var(--brand-sky, #0ea5e9);
  border: 1px solid #bae6fd;
}
.action-btn-status:hover {
  background: var(--brand-sky, #0ea5e9);
  color: white;
  border-color: var(--brand-sky, #0ea5e9);
}
</style>
