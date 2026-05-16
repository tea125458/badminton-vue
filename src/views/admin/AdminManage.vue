<script setup>
/**
 * 職員管理頁 — 完整 CRUD
 * 參照 templates/admin/list.html 邏輯，遷移至 Vue 3
 */
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import Swal from 'sweetalert2'
import { useExport } from '@/composables/useExport'

const { exportData } = useExport()

const router = useRouter()

// ===== 狀態 =====
const admins = ref([])
const isLoading = ref(false)
const keyword = ref('')
const isSearching = ref(false)

// ===== 分頁狀態 =====
const currentPage = ref(1)
const pageSize = ref(10)

const totalPages = computed(() => Math.ceil(admins.value.length / pageSize.value))

const paginatedAdmins = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return admins.value.slice(start, end)
})

function changePage(p) {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// 目前登入的管理員 ID（不能刪除自己、不能改自己狀態）
const currentAdminId = ref(null)
const adminInfo = localStorage.getItem('adminInfo')
if (adminInfo) {
  try {
    currentAdminId.value = JSON.parse(adminInfo).adminId
  } catch (e) {}
}

function isSelf(id) {
  return id === currentAdminId.value
}

// Modal 狀態
const showModal = ref(false)
const modalTitle = ref('新增職員')
const editId = ref(null)
const form = ref({
  username: '',
  password: '',
  fullName: '',
  role: 'STAFF',
  gender: '男',
  birthday: '',
  phone: '',
  email: '',
})

// 備註 Modal
const showNoteModal = ref(false)
const noteTarget = ref({ id: null, name: '', note: '' })

// ===== 權限檢查：只有 MANAGER 才能看此頁 =====
onMounted(() => {
  try {
    const info = JSON.parse(localStorage.getItem('adminInfo'))
    if (!info || info.role !== 'MANAGER') {
      alert('此頁面僅限主管存取')
      router.replace('/admin/members')
      return
    }
  } catch {
    router.replace('/admin/members')
    return
  }
  loadData()
})

// ===== 載入資料 =====
async function loadData() {
  isLoading.value = true
  try {
    admins.value = await adminApi.getAll()
  } catch (e) {
    alert('載入失敗：' + e.message)
  } finally {
    isLoading.value = false
  }
}

// ===== 搜尋 =====
async function searchAdmins() {
  if (!keyword.value.trim()) {
    resetSearch()
    return
  }
  isLoading.value = true
  try {
    admins.value = await adminApi.search(keyword.value.trim())
    isSearching.value = true
    currentPage.value = 1 // 重設回第一頁
  } catch (e) {
    alert('搜尋失敗：' + e.message)
  } finally {
    isLoading.value = false
  }
}

function resetSearch() {
  keyword.value = ''
  isSearching.value = false
  loadData()
}

// ===== 新增 Modal =====
function openCreateModal() {
  modalTitle.value = '新增職員'
  editId.value = null
  form.value = {
    username: '',
    password: '',
    fullName: '',
    role: 'STAFF',
    gender: '男',
    birthday: '2000-01-01',
    phone: '',
    email: '',
  }
  showModal.value = true
}

// ===== 編輯 Modal =====
async function openEditModal(id) {
  try {
    const a = await adminApi.getById(id)
    modalTitle.value = '編輯職員'
    editId.value = a.adminId
    form.value = {
      username: a.username || '',
      password: '',
      fullName: a.fullName || '',
      role: a.role || 'STAFF',
      gender: a.gender || '男',
      birthday: a.birthday || '',
      phone: a.phone || '',
      email: a.email || '',
    }
    showModal.value = true
  } catch (e) {
    alert('無法取得職員資料')
  }
}

// ===== 儲存 =====
async function saveAdmin() {
  const d = { ...form.value }
  if (!d.username || !d.fullName || !d.gender || !d.birthday || !d.phone || !d.email) {
    alert('請填寫所有必填欄位！')
    return
  }
  if (!editId.value && !d.password) {
    alert('新增職員時請設定密碼！')
    return
  }

  // 電話驗證
  const phoneDigits = d.phone.replace(/\D/g, '')
  if (phoneDigits.length !== 10 || !phoneDigits.startsWith('09')) {
    alert('電話格式錯誤！必須為 09 開頭的 10 位數字')
    return
  }

  // Email 驗證
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    alert('Email 格式錯誤！')
    return
  }

  if (!d.password) delete d.password

  try {
    if (editId.value) {
      await adminApi.update(editId.value, d)
    } else {
      await adminApi.add(d)
    }
    showModal.value = false
    loadData()

    // 使用 SweetAlert2 顯示成功訊息
    Swal.fire({
      title: editId.value ? '更新成功！' : '新增成功！',
      text: editId.value ? '職員資料已同步' : '新職員已加入系統',
      icon: 'success',
      iconColor: '#0ea5e9',
      showConfirmButton: false,
      timer: 1500,
      borderRadius: '1.25rem',
      width: '350px',
      background: '#ffffff',
      color: '#334155',
    })
  } catch (e) {
    Swal.fire({
      title: '操作失敗',
      text: e.response?.data || e.message,
      icon: 'error',
      borderRadius: '1.25rem',
      confirmButtonColor: '#0ea5e9',
    })
  }
}

// ===== 刪除 =====
async function deleteAdmin(id, name) {
  const result = await Swal.fire({
    title: '確定要刪除職員嗎？',
    text: `您即將刪除職員「${name}」`,
    icon: 'warning',
    iconColor: '#0ea5e9',
    showCancelButton: true,
    confirmButtonText: '確定刪除',
    cancelButtonText: '取消',
    reverseButtons: true,
    background: '#ffffff',
    color: '#334155',
    borderRadius: '1.25rem',
    confirmButtonColor: '#0ea5e9',
    cancelButtonColor: '#94a3b8',
    width: '400px',
    customClass: {
      popup: 'swal2-custom-popup',
      title: 'swal2-custom-title',
      confirmButton: 'swal2-custom-confirm',
      cancelButton: 'swal2-custom-cancel',
    },
  })

  if (result.isConfirmed) {
    try {
      await adminApi.delete(id)
      loadData()
      Swal.fire({
        title: '已刪除！',
        icon: 'success',
        iconColor: '#0ea5e9',
        timer: 1000,
        showConfirmButton: false,
        borderRadius: '1.25rem',
        width: '300px',
      })
    } catch (e) {
      Swal.fire({
        title: '出錯了！',
        text: '刪除失敗：' + e.message,
        icon: 'error',
        borderRadius: '1.25rem',
      })
    }
  }
}

// ===== 變更狀態 =====
async function changeStatus(id, status) {
  try {
    await adminApi.updateStatus(id, status)
    loadData()
  } catch (e) {
    alert('狀態更新失敗')
  }
}

// ===== 備註 =====
function openNoteModal(id, name, note) {
  noteTarget.value = { id, name, note: note === 'null' || !note ? '' : note }
  showNoteModal.value = true
}

async function saveNote() {
  try {
    await adminApi.updateNote(noteTarget.value.id, noteTarget.value.note)
    showNoteModal.value = false
    loadData()
  } catch (e) {
    alert('備註更新失敗')
  }
}

// ===== 電話自動格式化 =====
function formatPhone() {
  let v = form.value.phone.replace(/\D/g, '')
  if (v.length > 10) v = v.substring(0, 10)
  let f = ''
  if (v.length > 0) f = v.substring(0, 4)
  if (v.length > 4) f += '-' + v.substring(4, 7)
  if (v.length > 7) f += '-' + v.substring(7, 10)
  form.value.phone = f
}

// ===== Badge 工具 =====
function getStatusClass(s) {
  return (
    { ACTIVE: 'badge-active', INACTIVE: 'badge-inactive', RESIGNED: 'badge-resigned' }[s] ||
    'badge-default'
  )
}
function getStatusLabel(s) {
  return { ACTIVE: '在職', INACTIVE: '停權', RESIGNED: '已離職' }[s] || s
}
function getRoleClass(r) {
  return r === 'MANAGER' ? 'badge-manager' : 'badge-staff'
}
function getRoleLabel(r) {
  return r === 'MANAGER' ? '主管' : '職員'
}

// ===== 匯出功能 =====
function getExportData() {
  return admins.value.map((a) => ({
    職員編號: a.adminId,
    帳號: a.username,
    姓名: a.fullName || '-',
    職位: a.role === 'MANAGER' ? '主管' : '職員',
    性別: a.gender || '-',
    生日: a.birthday || '-',
    電話: a.phone || '-',
    Email: a.email || '-',
    狀態: a.status === 'ACTIVE' ? '在職' : a.status === 'RESIGNED' ? '已離職' : '停權',
    備註: a.note || '-',
    創建時間: a.createdAt || '-',
  }))
}

function handleExport(format) {
  const fileName = `職員資料`
  // useExport 支援的格式為大寫: 'EXCEL', 'JSON', 'PDF'
  const exportFormat = format.toUpperCase()
  exportData(getExportData(), exportFormat, fileName)
}
</script>

<template>
  <div class="admin-manage">
    <!-- 頁面標題 + 搜尋列 -->
    <div class="page-header">
      <h2><i class="bi bi-person-badge"></i> 職員管理</h2>
      <div class="header-actions">
        <!-- 匯出按鈕 -->
        <div class="dropdown">
          <button
            class="btn btn-export dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            匯出
          </button>
          <ul class="dropdown-menu shadow-sm border-0" style="border-radius: 0.75rem; font-size: 0.85rem">
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2 py-2" @click="handleExport('excel')">
                <i class="bi bi-file-earmark-excel text-success"></i> 匯出 Excel
              </button>
            </li>
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2 py-2" @click="handleExport('json')">
                <i class="bi bi-filetype-json text-primary"></i> 匯出 JSON
              </button>
            </li>
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2 py-2" @click="handleExport('pdf')">
                <i class="bi bi-file-earmark-pdf text-danger"></i> 匯出 PDF
              </button>
            </li>
          </ul>
        </div>

        <div class="search-box">
          <input
            v-model="keyword"
            type="text"
            placeholder="搜尋 ID、帳號、姓名..."
            @keydown.enter="searchAdmins"
          />
          <button class="btn-search" @click="searchAdmins">
            <i class="bi bi-search"></i>
          </button>
        </div>
        <button v-if="isSearching" class="btn-clear" @click="resetSearch">
          <i class="bi bi-x-lg"></i> 清除
        </button>
        <button class="btn-add" @click="openCreateModal">
          <i class="bi bi-plus-lg"></i> 新增職員
        </button>
      </div>
    </div>

    <!-- 職員表格 -->
    <div class="table-card">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>載入中...</span>
      </div>

      <div v-else-if="admins.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>目前沒有職員資料</p>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>編號</th>
            <th>帳號 / 姓名</th>
            <th>職位權限</th>
            <th>性別 / 生日</th>
            <th>聯絡資訊</th>
            <th>創建時間</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in paginatedAdmins" :key="a.adminId">
            <td class="td-id">{{ a.adminId }}</td>
            <td>
              <strong>{{ a.username }}</strong>
              <div class="text-sub">{{ a.fullName || '' }}</div>
            </td>
            <td>
              <span class="badge" :class="getRoleClass(a.role)">{{ getRoleLabel(a.role) }}</span>
            </td>
            <td>
              <div>{{ a.gender || '-' }}</div>
              <div class="text-sub">{{ a.birthday || '-' }}</div>
            </td>
            <td>
              <div class="text-sm">{{ a.phone || '-' }}</div>
              <div class="text-sub">{{ a.email || '-' }}</div>
            </td>
            <td class="text-sm">{{ a.createdAt || '-' }}</td>
            <td>
              <span class="badge" :class="getStatusClass(a.status)">{{
                getStatusLabel(a.status)
              }}</span>
            </td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-sm action-btn action-btn-edit" title="編輯職員" @click="openEditModal(a.adminId)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  class="btn btn-sm action-btn action-btn-note"
                  title="備註"
                  @click="openNoteModal(a.adminId, a.fullName || a.username, a.note)"
                >
                  <i class="bi bi-sticky"></i>
                </button>
                <button
                  class="btn btn-sm action-btn action-btn-delete"
                  :class="{ 'btn-disabled': isSelf(a.adminId) }"
                  :disabled="isSelf(a.adminId)"
                  :title="isSelf(a.adminId) ? '不能刪除自己' : '刪除職員'"
                  @click="!isSelf(a.adminId) && deleteAdmin(a.adminId, a.username)"
                >
                  <i class="bi bi-trash3"></i>
                </button>
                <div class="dropdown">
                  <button
                    class="btn btn-sm action-btn action-btn-status dropdown-toggle"
                    :class="{ 'btn-disabled': isSelf(a.adminId) }"
                    :disabled="isSelf(a.adminId)"
                    data-bs-toggle="dropdown"
                    title="變更狀態"
                  >
                    <i class="bi bi-arrow-repeat"></i>
                  </button>
                  <ul v-if="!isSelf(a.adminId)" class="dropdown-menu">
                    <li>
                      <a class="dropdown-item" href="#" @click.prevent="changeStatus(a.adminId, 'ACTIVE')">
                        <i class="bi bi-check-circle text-success me-1"></i>在職
                      </a>
                    </li>
                    <li>
                      <a class="dropdown-item" href="#" @click.prevent="changeStatus(a.adminId, 'INACTIVE')">
                        <i class="bi bi-x-circle text-warning me-1"></i>停權
                      </a>
                    </li>
                    <li>
                      <a class="dropdown-item" href="#" @click.prevent="changeStatus(a.adminId, 'RESIGNED')">
                        <i class="bi bi-dash-circle text-danger me-1"></i>已離職
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分頁控制 -->
      <div v-if="admins.length > 0" class="table-footer">
        <div class="table-footer-left">
          共 <strong>{{ admins.length }}</strong> 筆
        </div>
        <nav class="table-footer-center">
          <ul class="pagination pagination-custom mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="changePage(currentPage - 1)">
                <i class="bi bi-chevron-left"></i>
              </button>
            </li>
            <li
              v-for="page in totalPages"
              :key="page"
              class="page-item"
              :class="{ active: currentPage === page }"
            >
              <button class="page-link" @click="changePage(page)">{{ page }}</button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link" @click="changePage(currentPage + 1)">
                <i class="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
        <div class="table-footer-right">
          顯示第 <strong>{{ (currentPage - 1) * pageSize + 1 }}</strong
          >–<strong>{{ Math.min(currentPage * pageSize, admins.length) }}</strong>
          筆，第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 頁
        </div>
      </div>
    </div>

    <!-- ===== 新增/編輯 Modal ===== -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3>{{ modalTitle }}</h3>
            <button class="modal-close" @click="showModal = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-col">
                <label>帳號</label>
                <input
                  v-model="form.username"
                  type="text"
                  placeholder="登入帳號"
                  :disabled="!!editId"
                />
              </div>
              <div class="form-col">
                <label>密碼</label>
                <input
                  v-model="form.password"
                  type="password"
                  :placeholder="editId ? '留空不修改' : '請設定密碼'"
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-col">
                <label>姓名</label>
                <input v-model="form.fullName" type="text" placeholder="請輸入姓名" />
              </div>
              <div class="form-col-half">
                <label>職位權限</label>
                <select v-model="form.role" :disabled="isSelf(editId)">
                  <option value="STAFF">一般職員</option>
                  <option value="MANAGER">主管</option>
                </select>
              </div>
              <div class="form-col-half">
                <label>性別</label>
                <select v-model="form.gender">
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-col-third">
                <label>生日</label>
                <input v-model="form.birthday" type="date" @click="$event.target.showPicker()" />
              </div>
              <div class="form-col-third">
                <label>手機號碼</label>
                <input
                  v-model="form.phone"
                  type="text"
                  placeholder="0912-345-678"
                  maxlength="12"
                  @input="formatPhone"
                />
              </div>
              <div class="form-col-third">
                <label>Email</label>
                <input v-model="form.email" type="email" placeholder="abc@mail.com" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showModal = false">取消</button>
            <button class="btn-save" @click="saveAdmin"><i class="bi bi-check-lg"></i> 儲存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== 備註 Modal ===== -->
    <Teleport to="body">
      <div v-if="showNoteModal" class="modal-overlay" @click.self="showNoteModal = false">
        <div class="modal-box modal-sm">
          <div class="modal-header">
            <h3>{{ noteTarget.name }} 的備註</h3>
            <button class="modal-close" @click="showNoteModal = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <textarea v-model="noteTarget.note" rows="5" placeholder="輸入管理備註..."></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showNoteModal = false">取消</button>
            <button class="btn-save" @click="saveNote"><i class="bi bi-check-lg"></i> 儲存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===== 複用 MemberManage 的樣式 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.page-header h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
}
.page-header h2 i {
  margin-right: 0.4rem;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: border-color 0.2s;
}
.search-box:focus-within {
  border-color: var(--brand-sky);
}
.search-box input {
  border: none;
  outline: none;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  width: 210px;
  background: #f8fafc;
}
.btn-search {
  border: none;
  background: none;
  padding: 0.5rem 0.75rem;
  color: #64748b;
  cursor: pointer;
}
.btn-search:hover {
  color: var(--brand-sky);
}

.btn-clear {
  padding: 0.45rem 0.85rem;
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #d97706;
  border-radius: 0.6rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-export {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-export:hover {
  background: #f8fafc;
  border-color: var(--brand-sky);
  color: var(--brand-sky);
}
.btn-back {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-back:hover {
  background: #f8fafc;
  color: var(--brand-sky);
}
.btn-add {
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  background: #00B4B4; /* 品牌藍綠色 (與商品管理一致) */
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

.table-card {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}
.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
}
.loading-state .spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-top-color: var(--brand-sky);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 0.5rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.empty-state i {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table thead {
  background: #1b4767;
  color: white;
}
.data-table th {
  padding: 0.85rem 1.1rem;
  font-family: 'Inter', 'Noto Sans TC', sans-serif;
  font-size: 1.12rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.data-table td {
  padding: 0.85rem 1.1rem;
  font-size: 0.95rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

/* ===== 分頁 (Table Footer) ===== */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
  border-radius: 0 0 0.75rem 0.75rem;
}

.table-footer-left {
  font-size: 0.8rem;
  color: #64748b;
  flex: 1;
}

.table-footer-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.table-footer-right {
  font-size: 0.8rem;
  color: #64748b;
  flex: 1;
  text-align: right;
}

.table-footer strong {
  color: var(--brand-dark);
}

.pagination-custom .page-link {
  border: none;
  color: #64748b;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.5rem 0.85rem;
  border-radius: 0.5rem;
  margin: 0 2px;
  transition: all 0.2s ease;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.pagination-custom .page-link:hover {
  background: #f0f9ff;
  color: var(--brand-sky);
}

.pagination-custom .active .page-link {
  background: var(--brand-sky) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
}

.pagination-custom .disabled .page-link {
  color: #cbd5e1;
  background: #f8fafc;
  box-shadow: none;
}

/* ===== 日期輸入框內部微調 (解決年/月/日間距不一) ===== */
input[type="date"]::-webkit-datetime-edit-text {
  padding: 0 0.1rem;
  color: #94a3b8;
}

input[type="date"]::-webkit-datetime-edit-year-field {
  padding: 0;
  margin-right: -0.1rem;
}

input[type="date"]::-webkit-datetime-edit-month-field,
input[type="date"]::-webkit-datetime-edit-day-field {
  padding: 0;
}
.data-table tbody tr {
  transition: background 0.15s;
}
.data-table tbody tr:hover {
  background: #f8fafc;
}
.td-id {
  font-weight: 700;
  color: #94a3b8;
}
.text-sub {
  color: #94a3b8;
  font-size: 0.85rem;
}
.text-sm {
  font-size: 0.85rem;
}

.badge {
  display: inline-block;
  padding: 0.3rem 0.7rem;
  border-radius: 9999px;
  font-size: 0.8rem;
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
.badge-resigned {
  background: #fee2e2;
  color: #dc2626;
}
.badge-manager {
  background: #fef9c3;
  color: #ca8a04;
}
.badge-staff {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
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
.action-btn-note {
  background: #f0f9ff;
  color: #0ea5e9;
  border: 1px solid #bae6fd;
}
.action-btn-note:hover {
  background: #0ea5e9;
  color: white;
  border-color: #0ea5e9;
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
.btn-disabled {
  opacity: 0.3;
  cursor: not-allowed !important;
  pointer-events: none;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal-box {
  background: white;
  border-radius: 1.25rem;
  width: 100%;
  max-width: 680px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.12);
  animation: modalIn 0.25s ease;
}
.modal-sm {
  max-width: 480px;
}
@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.modal-close {
  border: none;
  background: none;
  font-size: 1.1rem;
  color: #94a3b8;
  cursor: pointer;
}
.modal-close:hover {
  color: #475569;
}
.modal-body {
  padding: 1.5rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f1f5f9;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.form-col {
  flex: 1;
}
.form-col-half {
  flex: 0.5;
}
.form-col-third {
  flex: 1;
}
.modal-body label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 0.3rem;
}
.req {
  color: #ef4444;
}
.modal-body input,
.modal-body select,
.modal-body textarea {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.2s;
}
.modal-body input:focus,
.modal-body select:focus,
.modal-body textarea:focus {
  border-color: var(--brand-sky);
  background: white;
}
.modal-body input:disabled {
  opacity: 0.5;
}
.modal-body textarea {
  resize: vertical;
  font-family: inherit;
}
.btn-cancel {
  padding: 0.55rem 1.25rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-save {
  padding: 0.55rem 1.25rem;
  border: none;
  border-radius: 0.6rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.text-success {
  color: #16a34a;
}
.text-warning {
  color: #d97706;
}
.text-danger {
  color: #ef4444;
}

/* SweetAlert2 客製化樣式補丁 */
:deep(.swal2-custom-popup) {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
  padding: 1.5rem !important;
  width: 400px !important;
}
:deep(.swal2-custom-title) {
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  margin-bottom: 0.5rem !important;
}
:deep(.swal2-custom-confirm) {
  padding: 8px 20px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  background-color: #0ea5e9 !important;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2) !important;
}
:deep(.swal2-custom-cancel) {
  padding: 8px 20px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }
  .search-box input {
    width: 150px;
  }
}
</style>
