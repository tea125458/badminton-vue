<script setup>
import { ref, onMounted, computed } from 'vue'
import { announcementApi } from '@/api/announcement'

// ========== 資料狀態 ==========
const announcements = ref([]) //公告列表
const loading = ref(true)
const errorMsg = ref('')

// ========== 搜尋 ==========
const searchKeyword = ref('')

// ========== 分頁 ==========
const currentPage = ref(1)
const pageSize = ref(10)

// ========== 頁面載入時呼叫 ==========
onMounted(() => {
  loadData()
})

// ========== 載入所有公告 ==========
async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    announcements.value = await announcementApi.findAll()
  } catch (error) {
    errorMsg.value = '載入失敗:' + error.message
  } finally {
    loading.value = false
  }
}

// ========== 搜尋（前端篩選） ==========
const filteredAnnouncements = computed(() => {
  if (!searchKeyword.value.trim()) return announcements.value
  const kw = searchKeyword.value.trim().toLowerCase()
  return announcements.value.filter((a) => {
    const title = (a.title || '').toLowerCase()
    const admin = a.admin ? (a.admin.fullName || a.admin.username || '').toLowerCase() : ''
    const category = (a.category || '').toLowerCase()
    return title.includes(kw) || admin.includes(kw) || category.includes(kw)
  })
})

// ========== 分頁計算 ==========
const totalPages = computed(() => {
  return Math.ceil(filteredAnnouncements.value.length / pageSize.value)
})

const pagedAnnouncements = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredAnnouncements.value.slice(start, end)
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// 搜尋時回到第一頁（用 watch 的替代方案）
function onSearch() {
  currentPage.value = 1
}

// 清除搜尋
function clearSearch() {
  searchKeyword.value = ''
  currentPage.value = 1
}

// ========== 狀態顯示 ==========
function statusText(status) {
  const map = {
    DRAFT: '草稿',
    PUBLISHED: '已發布',
    ARCHIVED: '已封存',
  }
  return map[status] || status
}

function statusClass(status) {
  const map = {
    DRAFT: 'badge-inactive',
    PUBLISHED: 'badge-active',
    ARCHIVED: 'badge-warning',
  }
  return map[status] || 'badge-default'
}

// ========== 日期格式 ==========
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}/${MM}/${dd} ${HH}:${mm}`
}

// ========== 刪除公告 ==========
async function deleteAnnouncement(item) {
  if (!confirm(`確定要刪除「${item.title}」嗎？`)) return

  try {
    await announcementApi.delete(item.announcementId)
    alert('刪除成功!')
    loadData()
  } catch (error) {
    alert('刪除失敗:' + error.message)
  }
}

// ========== 變更狀態 ==========
async function changeStatus(id, newStatus) {
  try {
    await announcementApi.updateStatus(id, newStatus)
    loadData()
  } catch (error) {
    alert('狀態更新失敗:' + error.message)
  }
}

// ========== Modal 控制 ==========
const showModal = ref(false)
const modalTitle = ref('')
const editId = ref(null)
const saving = ref(false)

// 圖片上傳狀態
const imageFile = ref(null)
const imagePreview = ref('')

//表單欄位
const form = ref({
  title: '',
  content: '',
  category: '',
  status: 'DRAFT',
  isPinned: false,
  imageUrl: '',
})

// 圖片選取
function onImageChange(e) {
  const file = e.target.files[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

// 移除圖片
function removeImage() {
  imageFile.value = null
  imagePreview.value = ''
  form.value.imageUrl = ''
}

// 打開新增 Modal
function openCreateModal() {
  modalTitle.value = '新增公告'
  editId.value = null
  form.value = {
    title: '',
    content: '',
    category: '',
    status: 'DRAFT',
    isPinned: false,
    imageUrl: '',
  }
  imageFile.value = null
  imagePreview.value = ''
  showModal.value = true
}

// 打開編輯 Modal（帶入舊資料）
function openEditModal(item) {
  modalTitle.value = '編輯公告'
  editId.value = item.announcementId
  form.value = {
    title: item.title,
    content: item.content || '',
    category: item.category || '',
    status: item.status || 'DRAFT',
    isPinned: item.isPinned || false,
    imageUrl: item.imageUrl || '',
  }
  imageFile.value = null
  // 編輯時顯示現有圖片
  imagePreview.value = item.imageUrl || ''
  showModal.value = true
}

// 儲存（根據有無 editId 判斷新增或更新）
async function saveAnnouncement() {
  if (!form.value.title.trim()) {
    alert('請輸入標題!')
    return
  }
  if (!form.value.content.trim()) {
    alert('請輸入公告內容!')
    return
  }

  saving.value = true
  try {
    // 如果有選擇新圖片，先上傳（並刪除舊圖）
    if (imageFile.value) {
      const res = await announcementApi.uploadImage(imageFile.value, form.value.imageUrl)
      form.value.imageUrl = res.imageUrl
    }
    if (editId.value) {
      await announcementApi.update(editId.value, form.value)
    } else {
      await announcementApi.create(form.value)
    }
    showModal.value = false
    alert(editId.value ? '更新成功!' : '新增成功!')
    loadData()
  } catch (error) {
    alert('操作失敗:' + error.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- 頁面標題 + 搜尋 + 新增按鈕 -->
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h2 class="fw-bold mb-0" style="font-size: 1.5rem">
      <i class="bi bi-megaphone me-2" style="color: var(--brand-sky)"></i>公告管理
    </h2>
    <div class="d-flex gap-2">
      <div class="input-group" style="width: 300px">
        <input
          type="text"
          class="form-control"
          v-model="searchKeyword"
          placeholder="搜尋標題、發布者、分類..."
          @keyup.enter="onSearch"
        />
        <button class="btn btn-outline-secondary" @click="onSearch">
          <i class="bi bi-search"></i>
        </button>
        <button class="btn btn-outline-danger" @click="clearSearch" title="清除搜尋">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-plus-lg me-1"></i>新增公告
      </button>
    </div>
  </div>

  <!-- 公告資料表格 -->
  <div class="card card-rounded shadow-sm border-0 overflow-hidden">
    <div class="card-body p-0">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th class="ps-4">編號</th>
            <th>圖片</th>
            <th>標題</th>
            <th>發布者</th>
            <th>分類</th>
            <th>置頂</th>
            <th>瀏覽數</th>
            <th>狀態</th>
            <th>建立時間</th>
            <th style="width: 200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 載入中 -->
          <tr v-if="loading">
            <td colspan="10" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary me-2"></div>
              載入中...
            </td>
          </tr>

          <!-- 載入錯誤 -->
          <tr v-else-if="errorMsg">
            <td colspan="9" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              <br />
              <button class="btn btn-sm btn-outline-primary mt-2" @click="loadData">重試</button>
            </td>
          </tr>

          <!-- 無資料 -->
          <tr v-else-if="filteredAnnouncements.length === 0">
            <td colspan="9" class="text-center text-muted py-4">
              目前沒有公告資料，請點擊「新增公告」按鈕
            </td>
          </tr>

          <!-- 正常渲染資料（注意用 pagedAnnouncements） -->
          <tr v-for="item in pagedAnnouncements" :key="item.announcementId" v-else>
            <td class="ps-4">{{ item.announcementId }}</td>
            <td>
              <img
                v-if="item.imageUrl"
                :src="
                  item.imageUrl.startsWith('/') || item.imageUrl.startsWith('http')
                    ? item.imageUrl
                    : '/' + item.imageUrl
                "
                :alt="item.title"
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
              <strong>{{ item.title }}</strong>
            </td>
            <td>{{ item.admin?.fullName || item.admin?.username || '-' }}</td>
            <td>{{ item.category || '-' }}</td>
            <td>
              <span v-if="item.isPinned"><i class="bi bi-pin-fill text-danger"></i>是</span>
              <span v-else>否</span>
            </td>
            <td>{{ item.viewCount || 0 }}</td>
            <td>
              <span class="badge" :class="statusClass(item.status)">
                {{ statusText(item.status) }}
              </span>
            </td>
            <td style="font-size: 0.85rem; white-space: nowrap; color: #64748b;">
              {{ formatDate(item.createdAt) }}
            </td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-sm action-btn action-btn-edit" title="編輯" @click="openEditModal(item)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  class="btn btn-sm action-btn action-btn-delete"
                  title="刪除"
                  @click="deleteAnnouncement(item)"
                >
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
                        @click.prevent="changeStatus(item.announcementId, 'DRAFT')"
                      >
                        <i class="bi bi-file-earmark text-secondary me-1"></i>草稿
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(item.announcementId, 'PUBLISHED')"
                      >
                        <i class="bi bi-check-circle text-success me-1"></i>已發布
                      </a>
                    </li>
                    <li>
                      <a
                        class="dropdown-item"
                        href="#"
                        @click.prevent="changeStatus(item.announcementId, 'ARCHIVED')"
                      >
                        <i class="bi bi-archive text-warning me-1"></i>已封存
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

  <!-- 分頁 -->
  <nav v-if="totalPages > 1" class="mt-3">
    <ul class="pagination justify-content-center mb-0">
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">‹</a>
      </li>
      <li
        v-for="page in totalPages"
        :key="page"
        class="page-item"
        :class="{ active: page === currentPage }"
      >
        <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
      </li>
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)">›</a>
      </li>
    </ul>
  </nav>
  <!-- 新增/編輯 Modal -->
  <div v-if="showModal" class="modal-backdrop fade show" @click="showModal = false"></div>
  <div v-if="showModal" class="modal fade show d-block" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ modalTitle }}</h5>
          <button type="button" class="btn-close" @click="showModal = false"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">標題<span class="text-danger">*</span></label>
            <input
              type="text"
              class="form-control"
              v-model="form.title"
              placeholder="例:場館整修公告"
            />
          </div>
          <div class="mb-3">
            <label class="form-label">內容<span class="text-danger">*</span></label>
            <textarea
              class="form-control"
              v-model="form.content"
              rows="5"
              placeholder="請輸入公告內容"
            >
            </textarea>
          </div>
          <div class="row">
            <div class="col-md-4 mb-3">
              <label class="form-label">分類</label>
              <select class="form-select" v-model="form.category">
                <option value="">--請選擇--</option>
                <option value="緊急">緊急</option>
                <option value="活動">活動</option>
                <option value="一般">一般</option>
              </select>
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">狀態</label>
              <select class="form-select" v-model="form.status">
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已發布</option>
                <option value="ARCHIVED">已封存</option>
              </select>
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">置頂</label>
              <div class="form-check form-switch mt-2">
                <input class="form-check-input" type="checkbox" v-model="form.isPinned" />
                <label class="form-check-label">設為置頂公告</label>
              </div>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">公告圖片</label>
            <div class="announce-upload-area" @click="$refs.announceFileInput.click()">
              <img
                v-if="imagePreview"
                :src="
                  imagePreview.startsWith('blob:') ||
                  imagePreview.startsWith('/') ||
                  imagePreview.startsWith('http')
                    ? imagePreview
                    : '/' + imagePreview
                "
                class="announce-upload-preview"
              />
              <div v-else class="announce-upload-placeholder">
                <i
                  class="bi bi-cloud-arrow-up"
                  style="font-size: 2rem; color: var(--brand-sky)"
                ></i>
                <p class="text-secondary mt-1 mb-0" style="font-size: 0.85rem">點擊上傳公告圖片（建議 16:9 比例）</p>
              </div>
            </div>
            <input
              ref="announceFileInput"
              type="file"
              accept="image/*"
              class="d-none"
              @change="onImageChange"
            />
            <button
              v-if="imagePreview"
              type="button"
              class="btn btn-sm btn-outline-danger mt-2"
              @click.stop="removeImage"
            >
              <i class="bi bi-trash3 me-1"></i>移除圖片
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="saveAnnouncement">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            {{ saving ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
.badge-warning {
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
}

/* ===== 圖片上傳區 ===== */
.announce-upload-area {
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

.announce-upload-area:hover {
  border-color: var(--brand-sky);
  background: #f0f9ff;
}

.announce-upload-preview {
  max-height: 160px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 0.75rem;
}

.announce-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
