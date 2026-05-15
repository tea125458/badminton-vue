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
    DRAFT: 'bg-secondary',
    PUBLISHED: 'bg-success',
    ARCHIVED: 'bg-warning text-dark',
  }
  return map[status] || 'bg-secondary'
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

//表單欄位
const form = ref({
  title: '',
  content: '',
  category: '',
  status: 'DRAFT',
  isPinned: false,
})

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
  }
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
  }
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

  try {
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
  <div class="card card-rounded shadow-sm border-0">
    <div class="card-body p-0">
      <table class="table table-hover mb-0">
        <thead>
          <tr style="background: var(--brand-dark); color: white">
            <th class="ps-4">ID</th>
            <th>標題</th>
            <th>發布者</th>
            <th>分類</th>
            <th>置頂</th>
            <th>瀏覽數</th>
            <th>狀態</th>
            <th style="width: 200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 載入中 -->
          <tr v-if="loading">
            <td colspan="8" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary me-2"></div>
              載入中...
            </td>
          </tr>

          <!-- 載入錯誤 -->
          <tr v-else-if="errorMsg">
            <td colspan="8" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              <br />
              <button class="btn btn-sm btn-outline-primary mt-2" @click="loadData">重試</button>
            </td>
          </tr>

          <!-- 無資料 -->
          <tr v-else-if="filteredAnnouncements.length === 0">
            <td colspan="8" class="text-center text-muted py-4">
              目前沒有公告資料，請點擊「新增公告」按鈕
            </td>
          </tr>

          <!-- 正常渲染資料（注意用 pagedAnnouncements） -->
          <tr v-for="item in pagedAnnouncements" :key="item.announcementId" v-else>
            <td class="ps-4">{{ item.announcementId }}</td>
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
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" title="編輯" @click="openEditModal(item)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  class="btn btn-outline-danger"
                  title="刪除"
                  @click="deleteAnnouncement(item)"
                >
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
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
          <button type="button" class="btn btn-primary" @click="saveAnnouncement">
            <i class="bi bi-check-lg me-1"></i>儲存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
