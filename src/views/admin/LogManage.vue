<script setup>
/**
 * 操作日誌管理頁面
 * 顯示系統操作紀錄，支援篩選（操作類型、日期）和關鍵字搜尋
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { systemLogApi } from '@/api/systemLog'
import { useExport } from '@/composables/useExport'
import { Bar, Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const { exportData } = useExport()

// 操作類型中英對照（簡化版）
const actionLabels = {
  REGISTER: '會員註冊',
  GOOGLE_REGISTER: 'Google 註冊',
  ADD_ADMIN: '新增職員',
  ADD_MEMBER: '新增會員',
  UPDATE_ADMIN: '修改職員',
  UPDATE_MEMBER: '修改會員',
  DELETE_ADMIN: '刪除職員',
  DELETE_MEMBER: '刪除會員',
  LOGIN: '系統登入',
  LOGOUT: '系統登出',
}

// 操作類型對應的顏色 (高飽和、亮麗配色)
const actionColors = {
  // 1. 亮綠色 (Vibrant Mint)
  REGISTER: { color: '#059669', bg: '#ecfdf5' },
  GOOGLE_REGISTER: { color: '#059669', bg: '#ecfdf5' },
  
  // 2. 亮藍色 (Bright Sky)
  ADD_ADMIN: { color: '#0284c7', bg: '#f0f9ff' },
  ADD_MEMBER: { color: '#0284c7', bg: '#f0f9ff' },
  UPDATE_ADMIN: { color: '#0284c7', bg: '#f0f9ff' },
  UPDATE_MEMBER: { color: '#0284c7', bg: '#f0f9ff' },
  
  // 3. 亮橘色 (Vibrant Orange - 匹配圖片)
  LOGIN: { color: '#f97316', bg: '#fff7ed' },
  
  // 4. 清爽灰 (Cool Gray)
  LOGOUT: { color: '#64748b', bg: '#f8fafc' },
  DELETE_ADMIN: { color: '#64748b', bg: '#f8fafc' },
  DELETE_MEMBER: { color: '#64748b', bg: '#f8fafc' },
}

const loading = ref(true)
const logs = ref([])

// 篩選條件
const filterAction = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')
const searchKeyword = ref('')
const showStats = ref(false)
const showExportMenu = ref(false)

// ===== 分頁狀態 =====
const currentPage = ref(1)
const pageSize = ref(10)

const totalPages = computed(() => Math.ceil(logs.value.length / pageSize.value))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return logs.value.slice(start, end)
})

function changePage(p) {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// 取得正規化後的操作類型（用於顯示、顏色、統計）
function getNormalizedAction(log) {
  const action = log.action
  const target = log.targetType
  
  // 1. 登入登出
  if (action === 'LOGIN') return 'LOGIN'
  if (action === 'LOGOUT') return 'LOGOUT'
  
  // 2. 註冊 (區分一般與 Google)
  if (action === 'REGISTER') {
    if (log.details && log.details.includes('Google')) return 'GOOGLE_REGISTER'
    return 'REGISTER'
  }
  
  // 3. 新增
  if (action === 'ADD_ADMIN' || action === 'ADD_MEMBER') {
    return action
  }
  if (action === 'CREATE') { // 兼容舊資料
    return target === 'ADMIN' ? 'ADD_ADMIN' : 'ADD_MEMBER'
  }
  
  // 4. 修改 (包含 UPDATE_PROFILE)
  if (action === 'UPDATE_ADMIN' || action === 'UPDATE_MEMBER') {
    return action
  }
  if (action === 'UPDATE_PROFILE') {
    return 'UPDATE_ADMIN'
  }
  if (action === 'UPDATE' || action.startsWith('UPDATE_')) { // 兼容舊資料
    return target === 'ADMIN' ? 'UPDATE_ADMIN' : 'UPDATE_MEMBER'
  }
  
  // 5. 刪除
  if (action === 'DELETE_ADMIN' || action === 'DELETE_MEMBER') {
    return action
  }
  if (action === 'DELETE') { // 兼容舊資料
    return target === 'ADMIN' ? 'DELETE_ADMIN' : 'DELETE_MEMBER'
  }
  
  return action
}

// 圖表設定
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 12, font: { size: 11 } }
    }
  }
}

// 統計圖表數據
const chartData = computed(() => {
  const actionCounts = {}
  const regByWeek = {} // 每週註冊數
  const regSources = { '一般註冊': 0, 'Google 註冊': 0 }

  logs.value.forEach(log => {
    // 1. 各類型操作計數 (用於長條圖)
    const actionKey = getNormalizedAction(log)
    const label = actionLabels[actionKey] || actionKey
    actionCounts[label] = (actionCounts[label] || 0) + 1

    // 2. 註冊相關統計
    if (log.action === 'REGISTER') {
      // 依週統計 (計算該日期所屬週的週一)
      const d = new Date(log.createdAt)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 調整到週一
      d.setDate(diff)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const date = String(d.getDate()).padStart(2, '0')
      const monday = `${year}-${month}-${date}`
      regByWeek[monday] = (regByWeek[monday] || 0) + 1

      // 來源統計
      if (log.details && log.details.includes('Google')) {
        regSources['Google 註冊']++
      } else {
        regSources['一般註冊']++
      }
    }
  })

  // 排序週數據 (取最近 8 週)
  const sortedWeeks = Object.keys(regByWeek).sort().slice(-8)
  const actionLabels_sorted = Object.keys(actionCounts).sort((a, b) => actionCounts[a] - actionCounts[b])

  return {
    // 各類型操作 (長條圖)
    actions: {
      labels: actionLabels_sorted,
      datasets: [{
        label: '次數',
        data: actionLabels_sorted.map(l => actionCounts[l]),
        backgroundColor: '#6366F1',
        borderRadius: 4
      }]
    },
    // 每週新增會員 (趨勢圖)
    weeklyReg: {
      labels: sortedWeeks.map(w => {
        const [m, d] = w.slice(5).split('-')
        return `${parseInt(m)}/${parseInt(d)} 當週`
      }),
      datasets: [{
        label: '註冊人數',
        data: sortedWeeks.map(w => regByWeek[w]),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    // 註冊來源 (圓餅圖)
    sources: {
      labels: Object.keys(regSources),
      datasets: [{
        data: Object.values(regSources),
        backgroundColor: ['#6366F1', '#F59E0B'],
        borderWidth: 0
      }]
    },
    // 數據摘要
    summary: {
      total: logs.value.length,
      thisWeek: regByWeek[sortedWeeks[sortedWeeks.length - 1]] || 0,
      googleTotal: regSources['Google 註冊'],
      lastDate: logs.value[0]?.createdAt.split('T')[0] || '-'
    }
  }
})

function getActionStyle(log) {
  const actionKey = getNormalizedAction(log)
  return actionColors[actionKey] || { color: '#64748B', bg: '#F8FAFC', icon: 'bi-clock-history' }
}

// 可選的操作類型列表（固定顯示簡化後的類型）
const actionOptions = computed(() => {
  return Object.keys(actionLabels)
})


// 載入日誌資料
async function loadLogs() {
  try {
    loading.value = true
    const params = {}
    // 不在呼叫後端時過濾操作類型，因為後端無法單憑字串區分 Google 註冊，且 UPDATE_ADMIN 也包含 UPDATE_PROFILE
    // 統一交由下方的 rawLogs.filter 進行前端精確過濾

    if (filterStartDate.value) params.startDate = filterStartDate.value
    if (filterEndDate.value) params.endDate = filterEndDate.value

    let rawLogs = []
    if (searchKeyword.value.trim()) {
      rawLogs = await systemLogApi.searchLogs(searchKeyword.value.trim())
    } else {
      rawLogs = await systemLogApi.getLogs(params)
    }
    
    // 隱藏舊的「查詢」紀錄
    const hiddenActions = ['READ_LIST', 'READ_DETAIL', 'SEARCH']
    rawLogs = rawLogs.filter(log => !hiddenActions.includes(log.action))
    
    // 如果有選擇特定操作類型，進行前端二次精確過濾 (區分 Admin / Member)
    if (filterAction.value) {
      logs.value = rawLogs.filter(log => getNormalizedAction(log) === filterAction.value)
    } else {
      logs.value = rawLogs
    }
    
  } catch (error) {
    console.error('載入日誌失敗:', error)
  } finally {
    loading.value = false
  }
}

// 搜尋
function handleSearch() {
  loadLogs()
}

// 篩選
function handleFilter() {
  searchKeyword.value = ''
  currentPage.value = 1 // 重設回第一頁
  loadLogs()
}

// 清除篩選
function clearFilters() {
  filterAction.value = ''
  filterStartDate.value = ''
  filterEndDate.value = ''
  searchKeyword.value = ''
  loadLogs()
}

// 格式化時間
function formatTime(datetime) {
  if (!datetime) return '-'
  const d = new Date(datetime)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 格式化名稱（拆分姓名與帳號）
function parseName(fullName) {
  if (!fullName || fullName === '-' || fullName === '系統' || fullName === '後台系統' || fullName === '前台系統') {
    return { name: fullName || '系統', account: 'System' }
  }
  // 處理帶括號的格式，例如：林佳穎 (admin.lin) 或 林佳穎 admin.lin
  const clean = fullName.replace(/\(|\)/g, ' ').trim()
  const parts = clean.split(/\s+/)
  if (parts.length > 1) {
    return { name: parts[0], account: parts[1] }
  }
  return { name: clean, account: 'User' } // 如果真的沒帳號，顯示預設身份
}

// 輔助格式化
function formatDisplayName(name) {
  if (!name || name === '-') return name
  return name.replace(/\(|\)/g, ' ').trim()
}

// 匯出用：將日誌資料轉換成易讀的格式
function getExportData() {
  return logs.value.map((log) => ({
    時間: formatTime(log.createdAt),
    操作類型: actionLabels[getNormalizedAction(log)] || log.action,
    操作者類型: log.operatorType === 'ADMIN' ? '管理員' : '會員',
    操作者: formatDisplayName(log.operatorName) || '系統',
    對象: formatDisplayName(log.targetName) || '-',
    操作細節: log.details || '-',
  }))
}

function handleExport(format) {
  exportData(getExportData(), format, '操作日誌')
}

function closeExportMenu() {
  showExportMenu.value = false
}

onMounted(() => {
  loadLogs()
  document.addEventListener('click', closeExportMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeExportMenu)
})
</script>

<template>
  <div class="log-manage">
    <!-- 頁面標題 -->
    <div class="mb-4">
      <h2 class="fw-bold title-standard">
        <i class="bi bi-clock-history me-2" style="color: var(--brand-sky)"></i>操作日誌
      </h2>
    </div>

    <!-- 搜尋與篩選工具列 -->
    <div class="card card-rounded shadow-sm border-0 mb-4" style="overflow: visible;">
      <div class="card-body p-3">
        <div class="row g-3 align-items-end">
          <!-- 關鍵字搜尋 (自動加寬) -->
          <div class="col-lg">
            <label class="form-label fw-semibold text-secondary" style="font-size: 0.9rem">關鍵字搜尋</label>
            <div class="input-group">
              <span class="input-group-text border-end-0 bg-white">
                <i class="bi bi-search text-secondary"></i>
              </span>
              <input
                v-model="searchKeyword"
                type="text"
                class="form-control border-start-0"
                placeholder="搜尋姓名、操作細節"
                @keyup.enter="handleSearch"
              />
            </div>
          </div>

          <!-- 操作類型 -->
          <div class="col-lg-2">
            <label class="form-label fw-semibold text-secondary" style="font-size: 0.9rem">操作類型</label>
            <select v-model="filterAction" class="form-select" @change="handleFilter">
              <option value="">全部類型</option>
              <option v-for="action in actionOptions" :key="action" :value="action">
                {{ actionLabels[action] || action }}
              </option>
            </select>
          </div>

          <!-- 起始日期 -->
          <div class="col-lg-2">
            <label class="form-label fw-semibold text-secondary" style="font-size: 0.9rem">起始日期</label>
            <input v-model="filterStartDate" type="date" class="form-control" style="font-size: 0.95rem" @change="handleFilter" @click="$event.target.showPicker()" />
          </div>

          <!-- 結束日期 -->
          <div class="col-lg-2">
            <label class="form-label fw-semibold text-secondary" style="font-size: 0.9rem">結束日期</label>
            <input v-model="filterEndDate" type="date" class="form-control" style="font-size: 0.95rem" @change="handleFilter" @click="$event.target.showPicker()" />
          </div>

          <!-- 按鈕區塊 (改為圖一風格，僅保留文字) -->
          <div class="col-lg-auto d-flex gap-2 flex-nowrap align-items-end mb-1">
            <!-- 搜尋 -->
            <button 
              class="btn-soft btn-soft-green px-2" 
              style="width: auto; min-width: 65px;"
              @click="handleSearch"
            >
              <span>搜尋</span>
            </button>

            <!-- 清除 -->
            <button 
              class="btn-soft btn-soft-blue px-2" 
              style="width: auto; min-width: 65px;"
              @click="clearFilters"
            >
              <span>清除</span>
            </button>

            <!-- 分析 -->
            <button 
              class="btn-soft btn-soft-brown px-2" 
              style="width: auto; min-width: 65px;"
              @click="showStats = true"
            >
              <span>分析</span>
            </button>

            <!-- 匯出 (下拉選單) -->
            <div class="dropdown">
              <button
                class="btn btn-soft btn-soft-sky px-2 dropdown-toggle hide-caret"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style="width: auto; min-width: 75px;"
                :disabled="logs.length === 0"
              >
                <span>匯出</span>
                <i class="bi bi-chevron-down small ms-1" style="font-size: 0.65rem;"></i>
              </button>
              <ul class="dropdown-menu shadow-sm border-0 mt-2 p-2" style="border-radius: 12px;">
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2 rounded-2 py-2" @click="handleExport('EXCEL')">
                    <i class="bi bi-file-earmark-excel text-success"></i> 匯出 Excel
                  </button>
                </li>
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2 rounded-2 py-2" @click="handleExport('JSON')">
                    <i class="bi bi-filetype-json text-primary"></i> 匯出 JSON
                  </button>
                </li>
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2 rounded-2 py-2" @click="handleExport('PDF')">
                    <i class="bi bi-file-earmark-pdf text-danger"></i> 匯出 PDF
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- 分析 Modal -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- 日誌表格 -->
    <div v-else class="card card-rounded shadow-sm border-0">
      <div class="card-body p-0">
        <!-- 無資料 -->
        <div v-if="logs.length === 0" class="text-center py-5">
          <i class="bi bi-inbox text-secondary" style="font-size: 2.5rem"></i>
          <p class="text-secondary mt-2 mb-0">目前沒有操作紀錄</p>
        </div>

        <!-- 表格 -->
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-header-standard">
              <tr>
                <th class="ps-4" style="width: 180px">時間</th>
                <th style="width: 150px">操作類型</th>
                <th style="width: 150px">操作者</th>
                <th style="width: 150px">對象</th>
                <th>操作細節</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in paginatedLogs" :key="log.logId" class="log-row">
                <!-- 時間 -->
                <td class="ps-4">
                  <span class="text-secondary" style="font-size: 0.82rem">
                    {{ formatTime(log.createdAt) }}
                  </span>
                </td>

                <!-- 操作類型 -->
                <td>
                  <span
                    class="badge px-3 py-1"
                    :style="{
                      backgroundColor: getActionStyle(log).bg,
                      color: getActionStyle(log).color,
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      borderRadius: '50px',
                      display: 'inline-block',
                      lineHeight: '1.2'
                    }"
                  >
                    {{ actionLabels[getNormalizedAction(log)] || log.action }}
                  </span>
                </td>

                <!-- 操作者 -->
                <td>
                  <div class="d-flex flex-column">
                    <span :class="{ 'fw-bold': log.operatorType === 'ADMIN' }" :style="{ 
                      color: log.operatorType === 'ADMIN' ? '#1b4767' : '#64748b', 
                      fontSize: '0.95rem' 
                    }">
                      {{ parseName(log.operatorName).name }}
                    </span>
                    <span v-if="parseName(log.operatorName).account" class="text-secondary opacity-50" style="font-size: 0.85rem">
                      {{ parseName(log.operatorName).account }}
                    </span>
                  </div>
                </td>

                <!-- 對象 -->
                <td>
                  <div class="d-flex flex-column">
                    <span :class="{ 'fw-bold': log.targetType === 'ADMIN' }" :style="{ 
                      color: log.targetType === 'ADMIN' ? '#1b4767' : '#64748b', 
                      fontSize: '0.95rem' 
                    }">
                      <!-- 根據操作者身分動態顯示前台/後台系統 -->
                      {{ 
                        (log.action === 'LOGIN' || log.action === 'LOGOUT') && log.operatorType === 'MEMBER' 
                        ? '前台系統' 
                        : parseName(log.targetName).name 
                      }}
                    </span>
                    <span class="text-secondary opacity-50" style="font-size: 0.85rem">
                      {{ 
                        (log.action === 'LOGIN' || log.action === 'LOGOUT') 
                        ? 'system' 
                        : (parseName(log.targetName).account || '') 
                      }}
                    </span>
                  </div>
                </td>

                <!-- 細節 -->
                <td>
                  <span class="text-secondary" style="font-size: 0.95rem">
                    {{ log.details || '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分頁控制 -->
        <div v-if="logs.length > 0" class="table-footer">
          <div class="table-footer-left">
            共 <strong>{{ logs.length }}</strong> 筆
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
            >–<strong>{{ Math.min(currentPage * pageSize, logs.length) }}</strong>
            筆，第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 頁
          </div>
        </div>
      </div>
    </div>

    <!-- 統計分析 Modal -->
    <div v-if="showStats" class="modal-backdrop fade show"></div>
    <div v-if="showStats" class="modal fade show d-block" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-graph-up-arrow me-2 text-info"></i>日誌數據分析
            </h5>
            <button type="button" class="btn-close" @click="showStats = false"></button>
          </div>
          <div class="modal-body p-4">
            <div class="row g-3">
              <!-- 左側：每週新增會員 -->
              <div class="col-md-8">
                <div class="card border-0 bg-light">
                  <div class="card-body">
                    <h6 class="fw-bold mb-3 small text-secondary">每週新增會員</h6>
                    <div style="height: 220px">
                      <Bar :data="chartData.weeklyReg" :options="chartOptions" />
                    </div>
                  </div>
                </div>
              </div>
              <!-- 右側：註冊來源圓餅圖 -->
              <div class="col-md-4">
                <div class="card border-0 bg-light">
                  <div class="card-body">
                    <h6 class="fw-bold mb-3 small text-secondary">註冊來源比例</h6>
                    <div style="height: 220px">
                      <Pie :data="chartData.sources" :options="chartOptions" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 下方：操作類型分佈 (長條圖) -->
              <div class="col-12 mt-3">
                <div class="card border-0 bg-light">
                  <div class="card-body">
                    <h6 class="fw-bold mb-3 small text-secondary">各類型操作統計</h6>
                    <div style="height: 200px">
                      <Bar :data="chartData.actions" :options="chartOptions" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 總結數據 -->
            <div class="row mt-4">
              <div class="col-12">
                <div class="p-3 rounded-3 bg-white border border-light">
                  <div class="row text-center">
                    <div class="col-4">
                      <div class="small text-secondary mb-1">總日誌筆數</div>
                      <div class="h5 fw-bold mb-0 text-dark">{{ chartData.summary.total }}</div>
                    </div>
                    <div class="col-4 border-start">
                      <div class="small text-secondary mb-1">本週新增會員</div>
                      <div class="h5 fw-bold mb-0 text-success">
                        {{ chartData.summary.thisWeek }} <small class="fw-normal" style="font-size: 0.7rem">人</small>
                      </div>
                    </div>
                    <div class="col-4 border-start">
                      <div class="small text-secondary mb-1">Google 註冊總數</div>
                      <div class="h5 fw-bold mb-0 text-warning">
                        {{ chartData.summary.googleTotal }} <small class="fw-normal" style="font-size: 0.7rem">人</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-secondary px-4" @click="showStats = false">關閉</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-standard {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
  font-family: 'Inter', 'Noto Sans TC', sans-serif;
  margin: 0;
}
.log-row {
  transition: background-color 0.15s ease;
}
.log-row:hover {
  background-color: #f8fbff !important;
}
.table-header-standard {
  background-color: #1b4767 !important;
}
.table-header-standard th {
  background-color: #1b4767 !important;
  color: white !important;
  font-weight: 600;
  border: none;
  padding: 1rem 1.1rem !important;
}
.card-rounded {
  border-radius: 1rem !important;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.table th,
.table td {
  padding: 0.85rem 1.1rem !important;
}
.form-control,
.form-select {
  font-size: 0.95rem;
  border-radius: 12px; /* 從 50px 調回 12px，匹配圖片中的圓潤矩形感 */
  padding-left: 1rem;
  padding-right: 1rem;
}
.form-control:focus,
.form-select:focus {
  border-color: var(--brand-sky);
  box-shadow: 0 0 0 0.2rem rgba(14, 165, 233, 0.15);
}

/* 關鍵字搜尋框的 input-group 圓角處理 */
.input-group {
  border-radius: 12px; /* 統一改為 12px */
  overflow: hidden;
  border: 1px solid #dee2e6;
}

.input-group .input-group-text,
.input-group .form-control {
  border: none; /* 移除內部邊框，由 input-group 統一管理 */
  border-radius: 0;
}

.input-group:focus-within {
  border-color: var(--brand-sky);
  box-shadow: 0 0 0 0.2rem rgba(14, 165, 233, 0.15);
}

/* ===== 日期輸入框內部微調 (解決年/月/日間距不一) ===== */
input[type="date"]::-webkit-datetime-edit-text {
  padding: 0 0.1rem; /* 調整斜線左右的間距 */
  color: #94a3b8;
}

input[type="date"]::-webkit-datetime-edit-year-field {
  padding: 0;
  margin-right: -0.1rem; /* 讓年跟斜線靠近一點 */
}

input[type="date"]::-webkit-datetime-edit-month-field,
input[type="date"]::-webkit-datetime-edit-day-field {
  padding: 0;
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

/* ===== Soft UI Buttons (圖一風格 - 圓潤且深色文字版本) ===== */
.btn-soft {
  height: 32px; /* 從 30px 稍微調回 32px 以容納較大字體 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1.2px solid transparent;
  transition: all 0.2s ease;
  background: white;
  position: relative;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  font-weight: 600;
  font-size: 0.95rem; /* 字體從 0.85rem 放大到 0.95rem */
}

.btn-soft span {
  margin-top: 0px;
}

.btn-soft:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}

.btn-soft:active:not(:disabled) {
  transform: translateY(0);
}

.btn-soft:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.8);
}

/* 深色文字配色方案 */
.btn-soft-green {
  background-color: #f0fdf4;
  border-color: #bbf7d0; /* 改回較為粉嫩、不突兀的淺綠色 */
  color: #166534;
  border-width: 1.2px; /* 恢復一般寬度 */
}
.btn-soft-green:hover:not(:disabled) {
  background-color: #dcfce7;
  border-color: #86efac;
}

.btn-soft-blue {
  background-color: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}
.btn-soft-blue:hover:not(:disabled) {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

.btn-soft-brown {
  background-color: #fdf8f6;
  border-color: #ede0d4;
  color: #f38653; /* 使用用戶指定的咖啡紅色 */
}
.btn-soft-brown:hover:not(:disabled) {
  background-color: #f5ebe0;
  border-color: #ddb892;
}

.btn-soft-sky {
  background-color: #f0f9ff;
  border-color: #bae6fd;
  color: #0369a1; /* 更深的 Sky Blue */
}
.btn-soft-sky:hover:not(:disabled) {
  background-color: #e0f2fe;
  border-color: #7dd3fc;
}

/* Hide Bootstrap default caret */
.hide-caret::after {
  display: none !important;
}

/* Dropdown animation */
.dropdown-menu {
  transform-origin: top right;
  animation: dropdownFade 0.2s ease-out;
  border-radius: 12px;
  overflow: hidden;
  font-size: 0.9rem;
}

@keyframes dropdownFade {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

