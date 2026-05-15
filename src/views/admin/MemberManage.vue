<script setup>
/**
 * 會員管理頁 — 完整 CRUD
 * 參照 templates/member/list.html 邏輯，遷移至 Vue 3
 */
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { memberApi } from '@/api/member'
import Swal from 'sweetalert2'

// ===== 狀態 =====
const members = ref([])
const isLoading = ref(false)
const keyword = ref('')
const isSearching = ref(false)

// 目前登入者角色
const isManager = ref(false)
try {
  const info = JSON.parse(localStorage.getItem('adminInfo'))
  isManager.value = info?.role === 'MANAGER'
} catch {}

// Modal 狀態
const showModal = ref(false)
const modalTitle = ref('新增會員')
const editId = ref(null)
const form = ref({ username: '', password: '', fullName: '', gender: '男', membershipLevel: 'NORMAL', birthday: '', phone: '', email: '' })

// 備註 Modal
const showNoteModal = ref(false)
const noteTarget = ref({ id: null, name: '', note: '' })

// 取得今天的日期字串 (YYYY-MM-DD)，用於限制 HTML 日期選擇器最大值
const todayDate = new Date().toISOString().split('T')[0]

// ===== 載入資料 =====
async function loadData() {
  isLoading.value = true
  try {
    members.value = await adminApi.getAllMembers()
  } catch (e) {
    alert('載入失敗：' + e.message)
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)

// ===== 搜尋 =====
async function searchMembers() {
  if (!keyword.value.trim()) { resetSearch(); return }
  isLoading.value = true
  try {
    members.value = await adminApi.searchMembers(keyword.value.trim())
    isSearching.value = true
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
  modalTitle.value = '新增會員'
  editId.value = null
  form.value = { username: '', password: '', fullName: '', gender: '男', membershipLevel: 'NORMAL', birthday: '2000-01-01', phone: '', email: '' }
  showModal.value = true
}

// ===== 編輯 Modal =====
async function openEditModal(id) {
  try {
    const m = await adminApi.getMemberById(id)
    modalTitle.value = '編輯會員'
    editId.value = m.memberId
    form.value = {
      username: m.username || '',
      password: '',
      fullName: m.fullName || '',
      gender: m.gender || '男',
      membershipLevel: m.membershipLevel || 'NORMAL',
      birthday: m.birthday || '',
      phone: m.phone || '',
      email: m.email || '',
    }
    showModal.value = true
  } catch (e) {
    alert('無法取得會員資料')
  }
}

// ===== 儲存 =====
async function saveMember() {
  const d = { ...form.value }
  if (!d.username || !d.fullName || !d.gender || !d.birthday || !d.phone || !d.email) {
    alert('請填寫所有必填欄位！'); return
  }
  if (!editId.value && !d.password) {
    alert('新增會員時請設定密碼！'); return
  }
  if (d.password && (d.password.length < 6 || d.password.length > 12)) {
    alert('密碼必須為 6-12 個字元！'); return
  }
  if (!/^[A-Za-z0-9]{6,12}$/.test(d.username)) {
    alert('帳號必須為 6-12 碼英數字 (不可包含特殊字元)'); return
  }
  if (d.birthday > todayDate) {
    alert('生日不可為未來的日期'); return
  }
  const phoneDigits = d.phone.replace(/\D/g, '')
  if (phoneDigits.length !== 10 || !phoneDigits.startsWith('09')) {
    alert('電話格式錯誤！必須為 09 開頭的 10 位數字'); return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    alert('Email 格式錯誤！'); return
  }
  if (!d.password) delete d.password

  try {
    if (editId.value) {
      await adminApi.updateMember(editId.value, d)
    } else {
      await adminApi.addMember(d)
    }
    showModal.value = false
    loadData()
    
    // 使用 SweetAlert2 顯示成功訊息
    Swal.fire({
      title: editId.value ? '更新成功！' : '新增成功！',
      text: editId.value ? '會員資料已同步' : '新會員已加入羽過天晴',
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
async function deleteMember(id, name) {
  const result = await Swal.fire({
    title: '確定要刪除嗎？',
    text: `您即將刪除會員「${name}」`,
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
      cancelButton: 'swal2-custom-cancel'
    }
  })

  if (result.isConfirmed) {
    try {
      await adminApi.deleteMember(id)
      loadData()
      Swal.fire({
        title: '已刪除！',
        icon: 'success',
        iconColor: '#0ea5e9',
        timer: 1000,
        showConfirmButton: false,
        borderRadius: '1.25rem',
        width: '300px'
      })
    } catch (e) {
      Swal.fire({
        title: '出錯了！',
        text: '刪除失敗：' + e.message,
        icon: 'error',
        borderRadius: '1.25rem'
      })
    }
  }
}

// ===== 變更狀態 =====
async function changeStatus(id, status) {
  try {
    await adminApi.updateMemberStatus(id, status)
    loadData()
  } catch (e) {
    alert('狀態更新失敗')
  }
}

// ===== 備註 =====
function openNoteModal(id, name, note) {
  noteTarget.value = { id, name, note: (note === 'null' || !note) ? '' : note }
  showNoteModal.value = true
}

async function saveNote() {
  try {
    await adminApi.updateMemberNote(noteTarget.value.id, noteTarget.value.note)
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
  return { ACTIVE: 'badge-active', INACTIVE: 'badge-inactive' }[s] || 'badge-default'
}
function getStatusLabel(s) {
  return { ACTIVE: '正常', INACTIVE: '停權' }[s] || s
}
function getLevelClass(l) {
  return l === 'VIP' ? 'badge-vip' : 'badge-normal'
}
function getLevelLabel(l) {
  return l === 'VIP' ? 'VIP' : '一般'
}
</script>

<template>
  <div class="member-manage">
    <!-- 頁面標題 + 搜尋列 -->
    <div class="page-header">
      <h2><i class="bi bi-people"></i> 會員管理</h2>
      <div class="header-actions">
        <div class="search-box">
          <input v-model="keyword" type="text" placeholder="搜尋 ID、帳號、姓名..."
                 @keydown.enter="searchMembers" />
          <button class="btn-search" @click="searchMembers">
            <i class="bi bi-search"></i>
          </button>
        </div>
        <button v-if="isSearching" class="btn-clear" @click="resetSearch">
          <i class="bi bi-x-lg"></i> 清除
        </button>
        <button class="btn-add" @click="openCreateModal">
          <i class="bi bi-plus-lg"></i> 新增會員
        </button>
      </div>
    </div>

    <!-- 會員表格 -->
    <div class="table-card">
      <!-- Loading -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>載入中...</span>
      </div>

      <!-- 空資料 -->
      <div v-else-if="members.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>目前沒有會員資料</p>
      </div>

      <!-- 表格 -->
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>帳號 / 姓名</th>
            <th>等級</th>
            <th>性別 / 生日</th>
            <th>聯絡資訊</th>
            <th>創建時間</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.memberId">
            <td class="td-id">{{ m.memberId }}</td>
            <td>
              <strong>{{ m.username }}</strong>
              <div class="text-sub">{{ m.fullName || '' }}</div>
            </td>
            <td><span class="badge" :class="getLevelClass(m.membershipLevel)">{{ getLevelLabel(m.membershipLevel) }}</span></td>
            <td>
              <div>{{ m.gender || '-' }}</div>
              <div class="text-sub">{{ m.birthday || '-' }}</div>
            </td>
            <td>
              <div class="text-sm">{{ m.phone || '-' }}</div>
              <div class="text-sub">{{ m.email || '-' }}</div>
            </td>
            <td class="text-sm">{{ m.createdAt || '-' }}</td>
            <td><span class="badge" :class="getStatusClass(m.status)">{{ getStatusLabel(m.status) }}</span></td>
            <td>
              <div class="action-btns">
                <div class="tooltip-container">
                  <button class="btn-icon btn-edit" @click="openEditModal(m.memberId)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <div class="custom-tooltip">編輯會員</div>
                </div>
                <div class="tooltip-container">
                  <button class="btn-icon btn-note" @click="openNoteModal(m.memberId, m.fullName || m.username, m.note)">
                    <i class="bi bi-sticky"></i>
                  </button>
                  <div v-if="m.note && m.note !== 'null'" class="custom-tooltip">
                    {{ m.note }}
                  </div>
                </div>
                <div class="tooltip-container">
                  <button class="btn-icon btn-delete" :class="{ 'btn-disabled': !isManager }" :disabled="!isManager" @click="isManager && deleteMember(m.memberId, m.username)">
                    <i class="bi bi-trash"></i>
                  </button>
                  <div class="custom-tooltip">{{ isManager ? '刪除會員' : '權限不足' }}</div>
                </div>
                <div class="status-dropdown" :class="{ 'disabled-dropdown': !isManager }">
                  <button class="btn-icon btn-status" :class="{ 'btn-disabled': !isManager }" title="變更狀態" :disabled="!isManager">
                    <i class="bi bi-arrow-repeat"></i>
                  </button>
                  <div v-if="isManager" class="dropdown-menu-custom">
                    <button @click="changeStatus(m.memberId, 'ACTIVE')">
                      <i class="bi bi-check-circle text-success"></i> 正常
                    </button>
                    <button @click="changeStatus(m.memberId, 'INACTIVE')">
                      <i class="bi bi-x-circle text-danger"></i> 停權
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 新增/編輯 Modal ===== -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3>{{ modalTitle }}</h3>
            <button class="modal-close" @click="showModal = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-col">
                <label>帳號</label>
                <input v-model="form.username" type="text" placeholder="6-12 碼英數字" maxlength="12" :disabled="!!editId" />
              </div>
              <div class="form-col">
                <label>密碼</label>
                <input v-model="form.password" type="password" :placeholder="editId ? (isManager ? '留空不修改' : '無權限修改') : '6-12 碼密碼'" maxlength="12" :disabled="!!editId && !isManager" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-col">
                <label>姓名</label>
                <input v-model="form.fullName" type="text" placeholder="請輸入姓名" :disabled="!!editId && !isManager" />
              </div>
              <div class="form-col-half">
                <label>性別</label>
                <select v-model="form.gender" :disabled="!!editId && !isManager">
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div class="form-col-half">
                <label>會員等級</label>
                <select v-model="form.membershipLevel" :disabled="!!editId && !isManager">
                  <option value="NORMAL">一般會員</option>
                  <option value="VIP">VIP 會員</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-col-third">
                <label>生日</label>
                <input v-model="form.birthday" type="date" :max="todayDate" @click="$event.target.showPicker()" />
              </div>
              <div class="form-col-third">
                <label>電話</label>
                <input v-model="form.phone" type="text" placeholder="0912-345-678" maxlength="12" @input="formatPhone" />
              </div>
              <div class="form-col-third">
                <label>Email</label>
                <input v-model="form.email" type="email" placeholder="abc@mail.com" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showModal = false">取消</button>
            <button class="btn-save" @click="saveMember"><i class="bi bi-check-lg"></i> 儲存</button>
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
            <button class="modal-close" @click="showNoteModal = false"><i class="bi bi-x-lg"></i></button>
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
/* ===== Page Header ===== */
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.page-header h2 {
  margin: 0; font-size: 1.4rem; font-weight: 700; color: var(--brand-dark);
}
.page-header h2 i { margin-right: 0.4rem; }
.header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

/* ===== Search ===== */
.search-box {
  display: flex; border: 2px solid #E2E8F0; border-radius: 0.75rem; overflow: hidden;
  transition: border-color 0.2s;
}
.search-box:focus-within { border-color: var(--brand-sky); }
.search-box input {
  border: none; outline: none; padding: 0.5rem 0.75rem; font-size: 0.85rem; width: 200px;
  background: #F8FAFC;
}
.btn-search {
  border: none; background: none; padding: 0.5rem 0.75rem; color: #64748B; cursor: pointer;
}
.btn-search:hover { color: var(--brand-sky); }

/* ===== Buttons ===== */
.btn-clear {
  padding: 0.45rem 0.85rem; border: 1px solid #FDE68A; background: #FFFBEB;
  color: #D97706; border-radius: 0.6rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
.btn-add {
  padding: 0.5rem 1rem; border: none; border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  color: white; font-size: 0.85rem; font-weight: 700; cursor: pointer;
  transition: all 0.2s;
}
.btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(14,165,233,0.3); }

/* ===== Table Card ===== */
.table-card {
  background: white; border-radius: 1rem; overflow: visible;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04); border: 1px solid #F1F5F9;
}
.loading-state, .empty-state {
  text-align: center; padding: 3rem; color: #94A3B8;
}
.loading-state .spinner {
  display: inline-block; width: 24px; height: 24px;
  border: 3px solid #E2E8F0; border-top-color: var(--brand-sky);
  border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 0.5rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state i { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }

/* ===== Data Table ===== */
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead { background: #1b4767; color: white; }
.data-table th {
  padding: 0.75rem 1rem; font-size: 0.8rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
}
.data-table td {
  padding: 0.75rem 1rem; font-size: 0.85rem; border-bottom: 1px solid #F1F5F9;
  vertical-align: middle;
}
.data-table tbody tr { transition: background 0.15s; }
.data-table tbody tr:hover { background: #F8FAFC; }
.td-id { font-weight: 700; color: #94A3B8; }
.text-sub { color: #94A3B8; font-size: 0.8rem; }
.text-sm { font-size: 0.8rem; }

/* ===== Badges ===== */
.badge {
  display: inline-block; padding: 0.3rem 0.7rem; border-radius: 9999px;
  font-size: 0.75rem; font-weight: 700;
}
.badge-active { background: #DCFCE7; color: #16A34A; }
.badge-inactive { background: #F1F5F9; color: #64748B; }
.badge-vip { background: #FEF9C3; color: #CA8A04; }
.badge-normal { background: #F8FAFC; color: #64748B; border: 1px solid #E2E8F0; }
.badge-default { background: #F1F5F9; color: #64748B; }

/* ===== Action Buttons ===== */
.action-btns { display: flex; gap: 0.3rem; align-items: center; }
.btn-icon {
  width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 0.5rem;
  background: white; cursor: pointer; display: flex; align-items: center;
  justify-content: center; font-size: 0.85rem; transition: all 0.15s;
}
.btn-edit:hover { background: #EFF6FF; color: #3B82F6; border-color: #BFDBFE; }
.btn-note:hover { background: #F0F9FF; color: #0EA5E9; border-color: #BAE6FD; }
.btn-delete:hover { background: #FEF2F2; color: #EF4444; border-color: #FECACA; }
.btn-status:hover { background: #F8FAFC; color: #64748B; }

/* Tooltip 樣式 */
.tooltip-container {
  position: relative;
  display: inline-block;
}
.custom-tooltip {
  visibility: hidden;
  position: absolute;
  top: 50%;
  right: 125%; /* 改為向左側顯示 */
  transform: translateY(-50%) translateX(10px);
  background-color: rgba(15, 23, 42, 0.95);
  color: white;
  text-align: left;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-all;
  width: max-content;
  max-width: 260px; /* 寬度稍微放寬一點 */
  z-index: 100;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}
/* 箭頭改為指向右側 */
.custom-tooltip::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 100%; /* 箭頭在提示框右邊 */
  margin-top: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: transparent transparent transparent rgba(15, 23, 42, 0.95);
}
.tooltip-container:hover .custom-tooltip {
  visibility: visible;
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
.btn-disabled {
  opacity: 0.3; cursor: not-allowed !important; pointer-events: none;
}
.disabled-dropdown { pointer-events: none; }
.modal-body select:disabled { opacity: 0.5; }

/* ===== Status Dropdown ===== */
.status-dropdown { position: relative; }
.dropdown-menu-custom {
  display: none; position: absolute; right: 0; top: 100%; margin-top: 4px;
  background: white; border: 1px solid #E2E8F0; border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08); z-index: 50; min-width: 120px;
  overflow: hidden;
}
.status-dropdown:hover .dropdown-menu-custom { display: block; }
.dropdown-menu-custom button {
  display: flex; align-items: center; gap: 0.4rem; width: 100%;
  padding: 0.6rem 1rem; border: none; background: none; font-size: 0.85rem;
  cursor: pointer; transition: background 0.15s;
}
.dropdown-menu-custom button:hover { background: #F8FAFC; }

/* ===== Modal ===== */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;
}
.modal-box {
  background: white; border-radius: 1.25rem; width: 100%; max-width: 680px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.12); animation: modalIn 0.25s ease;
}
.modal-sm { max-width: 480px; }
@keyframes modalIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9;
}
.modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
.modal-close { border: none; background: none; font-size: 1.1rem; color: #94A3B8; cursor: pointer; }
.modal-close:hover { color: #475569; }
.modal-body { padding: 1.5rem; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.5rem;
  padding: 1rem 1.5rem; border-top: 1px solid #F1F5F9;
}

/* ===== Form Inside Modal ===== */
.form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
.form-col { flex: 1; }
.form-col-half { flex: 0.5; }
.form-col-third { flex: 1; }
.modal-body label {
  display: block; font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.3rem;
}
.req { color: #EF4444; }
.modal-body input, .modal-body select, .modal-body textarea {
  width: 100%; padding: 0.6rem 0.75rem; border: 2px solid #E2E8F0; border-radius: 0.6rem;
  font-size: 0.85rem; background: #F8FAFC; outline: none; transition: border-color 0.2s;
}
.modal-body input:focus, .modal-body select:focus, .modal-body textarea:focus {
  border-color: var(--brand-sky); background: white;
}
.modal-body input:disabled { opacity: 0.5; }
.modal-body textarea { resize: vertical; font-family: inherit; }
.btn-cancel {
  padding: 0.55rem 1.25rem; border: 1px solid #E2E8F0; background: white;
  border-radius: 0.6rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
}
.btn-save {
  padding: 0.55rem 1.25rem; border: none; border-radius: 0.6rem;
  background: linear-gradient(135deg, var(--brand-sky), var(--brand-teal));
  color: white; font-size: 0.85rem; font-weight: 700; cursor: pointer;
  transition: all 0.2s;
}
.btn-save:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(14,165,233,0.3); }

.text-success { color: #16A34A; }
.text-danger { color: #EF4444; }

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
  .page-header { flex-direction: column; align-items: flex-start; }
  .form-row { flex-direction: column; gap: 0.75rem; }
  .search-box input { width: 150px; }
}
</style>
