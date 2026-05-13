import { ref } from 'vue'

/**
 * 專門處理日期區間與快捷面板（本週、本月等）的 Composable
 */
export function useDateFilter() {
  const dateFrom = ref('') // 實際應用的開始日期
  const dateTo = ref('') // 實際應用的結束日期
  const showDatePanel = ref(false) // 控制面板顯示/隱藏
  const datePresetLabel = ref('全部日期') // 目前選中的快捷標籤
  
  // 面板內的暫存日期（按 Apply 才套用）
  const tempDateFrom = ref('')
  const tempDateTo = ref('')

  // 設定快捷日期範圍
  const setDateRange = (type) => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const fmt = (d) => d.toISOString().split('T')[0]
    const getMonday = (d) => {
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(d.setDate(diff))
    }

    const labelMap = {
      today: '今天',
      yesterday: '昨天',
      thisWeek: '本週',
      lastWeek: '上週',
      thisMonth: '本月',
      lastMonth: '上月',
      all: '全部日期',
    }
    datePresetLabel.value = labelMap[type] || '自訂範圍'

    switch (type) {
      case 'today':
        tempDateFrom.value = todayStr
        tempDateTo.value = todayStr
        break
      case 'yesterday': {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        tempDateFrom.value = fmt(yesterday)
        tempDateTo.value = fmt(yesterday)
        break
      }
      case 'thisWeek': {
        const monday = getMonday(new Date(now))
        const sunday = new Date(monday)
        sunday.setDate(sunday.getDate() + 6)
        tempDateFrom.value = fmt(monday)
        tempDateTo.value = fmt(sunday)
        break
      }
      case 'lastWeek': {
        const thisMonday = getMonday(new Date(now))
        const lastMonday = new Date(thisMonday)
        lastMonday.setDate(lastMonday.getDate() - 7)
        const lastSunday = new Date(thisMonday)
        lastSunday.setDate(lastSunday.getDate() - 1)
        tempDateFrom.value = fmt(lastMonday)
        tempDateTo.value = fmt(lastSunday)
        break
      }
      case 'thisMonth': {
        tempDateFrom.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        tempDateTo.value = fmt(thisMonthEnd)
        break
      }
      case 'lastMonth': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        tempDateFrom.value = fmt(lastMonth)
        tempDateTo.value = fmt(lastMonthEnd)
        break
      }
      case 'all':
        tempDateFrom.value = ''
        tempDateTo.value = ''
        break
    }
  }

  const openDatePanel = () => {
    tempDateFrom.value = dateFrom.value
    tempDateTo.value = dateTo.value
    showDatePanel.value = true
  }

  const applyDateRange = () => {
    dateFrom.value = tempDateFrom.value
    dateTo.value = tempDateTo.value
    if (!dateFrom.value && !dateTo.value) {
      datePresetLabel.value = '全部日期'
    } else if (datePresetLabel.value === '全部日期') {
      datePresetLabel.value = '自訂範圍'
    }
    showDatePanel.value = false
  }

  const cancelDatePanel = () => {
    showDatePanel.value = false
  }

  return {
    dateFrom,
    dateTo,
    showDatePanel,
    datePresetLabel,
    tempDateFrom,
    tempDateTo,
    setDateRange,
    openDatePanel,
    applyDateRange,
    cancelDatePanel
  }
}
