<script setup>
/**
 * 操作日誌管理頁面
 * 顯示系統操作紀錄，支援篩選（操作類型、日期）和關鍵字搜尋
 */
import { ref, onMounted, computed } from 'vue'
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

// 操作類型對應的顏色與圖標
const actionColors = {
  REGISTER: { color: '#059669', bg: '#D1FAE5', icon: 'bi-person-plus' },
  GOOGLE_REGISTER: { color: '#059669', bg: '#D1FAE5', icon: 'bi-google' },
  ADD_ADMIN: { color: '#059669', bg: '#D1FAE5', icon: 'bi-person-plus-fill' },
  ADD_MEMBER: { color: '#059669', bg: '#D1FAE5', icon: 'bi-person-plus' },
  UPDATE_ADMIN: { color: '#0284C7', bg: '#E0F2FE', icon: 'bi-pencil-square' },
  UPDATE_MEMBER: { color: '#0284C7', bg: '#E0F2FE', icon: 'bi-pencil-square' },
  LOGIN: { color: '#8B5CF6', bg: '#EDE9FE', icon: 'bi-box-arrow-in-right' },
  LOGOUT: { color: '#64748B', bg: '#F1F5F9', icon: 'bi-box-arrow-right' },
  DELETE_ADMIN: { color: '#E11D48', bg: '#FFE4E6', icon: 'bi-trash' },
  DELETE_MEMBER: { color: '#E11D48', bg: '#FFE4E6', icon: 'bi-trash' },
}

const loading = ref(true)
const logs = ref([])

// 篩選條件
const filterAction = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')
const searchKeyword = ref('')
const showStats = ref(false)

// 取得正規化後的操作類型（用於顯示、顏色、統計）
function getNormalizedAction(log) {
  const action = log.action
  // 將所有修改相關的類型簡化為「修改會員」或「修改職員」
  if (action.startsWith('UPDATE_') || action === 'UPDATE_PROFILE') {
    return log.targetType === 'ADMIN' ? 'UPDATE_ADMIN' : 'UPDATE_MEMBER'
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
      const monday = new Date(d.setDate(diff)).toISOString().split('T')[0]
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
  const actionLabels_sorted = Object.keys(actionCounts).sort((a, b) => actionCounts[b] - actionCounts[a])

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
      labels: sortedWeeks.map(w => w.slice(5) + ' 週'),
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
    if (filterAction.value) params.action = filterAction.value
    if (filterStartDate.value) params.startDate = filterStartDate.value
    if (filterEndDate.value) params.endDate = filterEndDate.value

    if (searchKeyword.value.trim()) {
      logs.value = await systemLogApi.searchLogs(searchKeyword.value.trim())
    } else {
      logs.value = await systemLogApi.getLogs(params)
    }
    
    // 隱藏舊的「查詢」紀錄，不顯示在畫面上
    const hiddenActions = ['READ_LIST', 'READ_DETAIL', 'SEARCH']
    logs.value = logs.value.filter(log => !hiddenActions.includes(log.action))
    
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
  if (!fullName || fullName === '-' || fullName === '系統') {
    return { name: fullName || '系統', account: '' }
  }
  const clean = fullName.replace(/\(|\)/g, '').trim()
  const parts = clean.split(/\s+/)
  if (parts.length > 1) {
    return { name: parts[0], account: parts[1] }
  }
  return { name: clean, account: '' }
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
  exportData(getExportData(), format)
}

onMounted(() => {
  loadLogs()
})
</script>

<template>
  <div class="container-fluid py-4 px-4">
    <!-- 頁面標題 -->
    <div class="mb-4">
      <h2 class="fw-bold mb-1" style="font-size: 1.5rem">
        <i class="bi bi-clock-history me-2" style="color: var(--brand-sky)"></i>操作日誌
      </h2>
      <p class="text-secondary mb-0" style="font-size: 0.85rem">
        查看系統中所有管理操作的紀錄，便於追蹤與稽核
      </p>
    </div>

    <!-- 搜尋與篩選工具列 -->
    <div class="card card-rounded shadow-sm border-0 mb-4">
      <div class="card-body p-3">
        <div class="row g-3 align-items-end">
          <!-- 關鍵字搜尋 (自動加寬) -->
          <div class="col-lg">
            <label class="form-label small fw-semibold text-secondary">關鍵字搜尋</label>
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
            <label class="form-label small fw-semibold text-secondary">操作類型</label>
            <select v-model="filterAction" class="form-select" @change="handleFilter">
              <option value="">全部類型</option>
              <option v-for="action in actionOptions" :key="action" :value="action">
                {{ actionLabels[action] || action }}
              </option>
            </select>
          </div>

          <!-- 起始日期 -->
          <div class="col-lg-2">
            <label class="form-label small fw-semibold text-secondary">起始日期</label>
            <input v-model="filterStartDate" type="date" class="form-control" @change="handleFilter" />
          </div>

          <!-- 結束日期 -->
          <div class="col-lg-2">
            <label class="form-label small fw-semibold text-secondary">結束日期</label>
            <input v-model="filterEndDate" type="date" class="form-control" @change="handleFilter" />
          </div>

          <!-- 按鈕 (寬度剛好) -->
          <div class="col-lg-auto d-flex gap-1 flex-nowrap align-items-end">
            <button class="btn btn-primary btn-sm px-2 text-nowrap" @click="handleSearch">
              <i class="bi bi-search me-1"></i>搜尋
            </button>
            <button class="btn btn-outline-secondary btn-sm px-2 text-nowrap" @click="clearFilters">
              <i class="bi bi-x-circle me-1"></i>清除
            </button>
            <button class="btn btn-outline-info btn-sm px-2 text-nowrap" @click="showStats = true">
              <i class="bi bi-bar-chart-line me-1"></i>分析
            </button>

            <!-- 匯出下拉選單 -->
            <div class="dropdown">
              <button
                class="btn btn-outline-success btn-sm px-2 dropdown-toggle text-nowrap"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                :disabled="logs.length === 0"
              >
                <i class="bi bi-download me-1"></i>匯出
              </button>
              <ul class="dropdown-menu shadow-sm">
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2" @click="handleExport('EXCEL')">
                    <i class="bi bi-file-earmark-excel text-success"></i> 匯出 Excel
                  </button>
                </li>
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2" @click="handleExport('JSON')">
                    <i class="bi bi-filetype-json text-primary"></i> 匯出 JSON
                  </button>
                </li>
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2" @click="handleExport('PDF')">
                    <i class="bi bi-file-earmark-pdf text-danger"></i> 匯出 PDF
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
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
            <thead>
              <tr class="bg-light">
                <th class="ps-4" style="width: 170px">時間</th>
                <th style="width: 120px">操作類型</th>
                <th style="width: 120px">操作者</th>
                <th style="width: 120px">對象</th>
                <th>操作細節</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.logId" class="log-row">
                <!-- 時間 -->
                <td class="ps-4">
                  <span class="text-secondary" style="font-size: 0.82rem">
                    {{ formatTime(log.createdAt) }}
                  </span>
                </td>

                <!-- 操作類型 -->
                <td>
                  <span
                    class="badge d-inline-flex align-items-center gap-1 px-2 py-1"
                    :style="{
                      backgroundColor: getActionStyle(log).bg,
                      color: getActionStyle(log).color,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: '6px',
                    }"
                  >
                    <i :class="['bi', getActionStyle(log).icon]" style="font-size: 0.7rem"></i>
                    {{ actionLabels[getNormalizedAction(log)] || log.action }}
                  </span>
                </td>

                <!-- 操作者 -->
                <td>
                  <div class="d-flex flex-column">
                    <span class="fw-bold" :style="{ color: '#475569', fontSize: '0.85rem' }">
                      {{ parseName(log.operatorName).name }}
                    </span>
                    <span v-if="parseName(log.operatorName).account" class="text-secondary opacity-75" style="font-size: 0.75rem">
                      {{ parseName(log.operatorName).account }}
                    </span>
                  </div>
                </td>

                <!-- 對象 -->
                <td>
                  <div class="d-flex flex-column">
                    <span class="fw-bold" :style="{ color: '#0d9488', fontSize: '0.85rem' }">
                      {{ parseName(log.targetName).name }}
                    </span>
                    <span v-if="parseName(log.targetName).account" class="text-secondary opacity-75" style="font-size: 0.75rem">
                      {{ parseName(log.targetName).account }}
                    </span>
                  </div>
                </td>

                <!-- 細節 -->
                <td>
                  <span class="text-secondary" style="font-size: 0.85rem">
                    {{ log.details || '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 統計 -->
        <div class="px-4 py-3 border-top d-flex justify-content-between align-items-center">
          <span class="text-secondary" style="font-size: 0.8rem">
            共 {{ logs.length }} 筆紀錄
          </span>
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
.log-row {
  transition: background-color 0.15s ease;
}
.log-row:hover {
  background-color: #f8fbff !important;
}
.form-control:focus,
.form-select:focus {
  border-color: var(--brand-sky);
  box-shadow: 0 0 0 0.2rem rgba(14, 165, 233, 0.15);
}
</style>
