import axios from 'axios'

/**
 * 🕐 時間衝突檢查 Composable
 * ============================
 * 用來檢查會員在指定時段是否已有「場地預約」或「已報名的臨打活動」。
 * 
 * 使用場景：
 * 1. 臨打報名前（PickupGamePage / PickupGameDetail）→ 檢查與「預約」和「其他臨打」的衝突
 * 2. 場地預約前（BookingPage）→ 檢查與「已報名臨打」的衝突
 */
export function useTimeConflict() {

  /**
   * 判斷兩個時間區間是否重疊（同一天才比較）
   * 例如：19:00-21:00 和 20:00-22:00 → true（有重疊）
   *       19:00-21:00 和 21:00-22:00 → false（緊鄰但不重疊）
   */
  function isTimeOverlap(date1, start1, end1, date2, start2, end2) {
    if (date1 !== date2) return false
    const toMin = (t) => {
      const parts = t.split(':')
      return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0)
    }
    const s1 = toMin(start1), e1 = toMin(end1)
    const s2 = toMin(start2), e2 = toMin(end2)
    return s1 < e2 && s2 < e1
  }

  /**
   * 檢查指定會員在目標時段是否有衝突
   * @param {number|string} memberId - 會員 ID
   * @param {string} targetDate - 目標日期 (YYYY-MM-DD)
   * @param {string} targetStart - 目標開始時間 (HH:mm)
   * @param {string} targetEnd - 目標結束時間 (HH:mm)
   * @param {object} options - 額外選項
   * @param {boolean} options.skipBookings - 是否跳過預約衝突檢查（預約頁面本身不需要比預約）
   * @param {number|string} options.excludeGameId - 排除的揪團 ID（避免跟自己比）
   * @returns {{ hasConflict: boolean, conflictMessage: string }}
   */
  async function checkTimeConflict(memberId, targetDate, targetStart, targetEnd, options = {}) {
    const { skipBookings = false, excludeGameId = null } = options

    try {
      // === 1. 檢查與「場地預約」的衝突 ===
      if (!skipBookings) {
        const bookingsRes = await axios.get('/api/bookings')
        const myBookings = bookingsRes.data.filter(b =>
          b.member?.memberId === Number(memberId) &&
          b.status === 'CONFIRMED' &&
          b.bookingDate === targetDate
        )

        for (const b of myBookings) {
          if (isTimeOverlap(targetDate, targetStart, targetEnd, b.bookingDate, b.startTime, b.endTime)) {
            const venueName = b.court?.venue?.venueName || '未知場館'
            const courtName = b.court?.courtName || ''
            return {
              hasConflict: true,
              conflictMessage: `您在 ${targetDate} ${b.startTime}~${b.endTime} 已有一筆場地預約（${venueName} ${courtName}），時間與本場活動重疊，無法報名。`
            }
          }
        }
      }

      // === 2. 檢查與「已報名臨打」的衝突 ===
      const [signupsRes, gamesRes] = await Promise.all([
        axios.get(`/api/pickup-game-signups/my-signups/${memberId}`),
        axios.get('/api/pickup-games')
      ])

      // 取出 JOINED 狀態的報名 → 對應到揪團資料取得時間
      const joinedGameIds = signupsRes.data
        .filter(s => s.status === 'JOINED')
        .map(s => s.game?.gameId)
        .filter(Boolean)

      const joinedGames = gamesRes.data.filter(g =>
        joinedGameIds.includes(g.gameId) &&
        g.status !== 'CANCELLED' &&
        g.gameDate === targetDate &&
        (excludeGameId === null || g.gameId !== Number(excludeGameId))
      )

      for (const g of joinedGames) {
        if (isTimeOverlap(targetDate, targetStart, targetEnd, g.gameDate, g.startTime, g.endTime)) {
          const venueName = g.court?.venue?.venueName || '未知場館'
          return {
            hasConflict: true,
            conflictMessage: `您在 ${targetDate} ${g.startTime}~${g.endTime} 已報名一場臨打活動（${venueName}），時間與本場活動重疊，無法重複報名。`
          }
        }
      }

      // 無衝突
      return { hasConflict: false, conflictMessage: '' }

    } catch (err) {
      console.error('時間衝突檢查失敗', err)
      // 檢查失敗時不阻擋操作，讓後端做最終把關
      return { hasConflict: false, conflictMessage: '' }
    }
  }

  return { checkTimeConflict, isTimeOverlap }
}
