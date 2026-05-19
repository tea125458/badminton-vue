<script setup>
import { ref, computed, onMounted } from 'vue'
import { venueApi } from '@/api/venue'
import { courtApi } from '@/api/court'

// ========== 資料狀態 ==========
const courts = ref([]) //球場列表
const venues = ref([]) // 場館列表（給下拉選單用
const loading = ref(true) //載入中
const errorMsg = ref('') //錯誤訊息

// ========== 分頁狀態 ==========
const currentPage = ref(1)
const pageSize = 10 // 每頁顯示幾筆

// ========== 分頁計算屬性 ==========
const totalPages = computed(() => Math.max(1, Math.ceil(courts.value.length / pageSize)))

const pagedCourts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return courts.value.slice(start, start + pageSize)
})

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
    // 載入後若當前頁超過總頁數，自動回到最後一頁
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
  } catch (error) {
    errorMsg.value = '載入失敗:' + error.message
  } finally {
    loading.value = false
  }
}

// ========== 分頁切換 ==========
function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
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
    <h2 class="page-title"><span class="title-emoji">🏸</span> 球場管理</h2>
    <button class="btn-add" @click="openCreateModal">
      <i class="bi bi-plus-lg"></i> 新增球場
    </button>
  </div>

  <!-- 球場資料表格 -->
  <div class="card card-rounded shadow-sm border-0 overflow-hidden">
    <div class="card-body p-0">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th class="ps-4">編號</th>
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
          <tr v-for="court in pagedCourts" :key="court.courtId" v-else>
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
              <div class="d-flex gap-1">
                <button class="btn btn-sm action-btn action-btn-edit" title="編輯" @click="openEditModal(court)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm action-btn action-btn-delete" title="刪除" @click="deleteCourt(court)">
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

    <!-- 分頁 -->
    <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
      <ul class="pagination pagination-custom">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <button class="page-link" @click="goToPage(currentPage - 1)">
            <i class="bi bi-chevron-left"></i>
          </button>
        </li>
        <li
          v-for="p in totalPages"
          :key="p"
          class="page-item"
          :class="{ active: p === currentPage }"
        >
          <button class="page-link" @click="goToPage(p)">{{ p }}</button>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <button class="page-link" @click="goToPage(currentPage + 1)">
            <i class="bi bi-chevron-right"></i>
          </button>
        </li>
      </ul>
    </nav>
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

<style scoped>
/* ===== 頁面標題（與職員管理統一）===== */
.page-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
}
.page-title i {
  margin-right: 0.4rem;
}
.title-emoji {
  filter: grayscale(1);
}

/* ===== 新增按鈕（與職員管理統一）===== */
.btn-add {
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  background: #00B4B4;
  color: white;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-add:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
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

/* ===== 自訂分頁（與 ProductManage 統一）===== */
.pagination-custom .page-link {
  border: none;
  color: #64748B;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.5rem 0.85rem;
  border-radius: 0.5rem;
  margin: 0 2px;
  transition: all 0.2s ease;
}
.pagination-custom .page-link:hover {
  background: #F0F9FF;
  color: var(--brand-sky);
}
.pagination-custom .active .page-link {
  background: var(--brand-sky);
  color: white;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
}
.pagination-custom .disabled .page-link {
  color: #CBD5E1;
}
</style>
