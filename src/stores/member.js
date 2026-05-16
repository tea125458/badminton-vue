/**
 * 會員認證 Pinia Store
 * 集中管理會員登入狀態、Token、會員資料
 * 取代散落各處的 localStorage 手動操作
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMemberStore = defineStore('member', () => {
  // 從 localStorage 恢復狀態（頁面重新整理時）
  const token = ref(localStorage.getItem('memberToken') || '')
  const memberInfo = ref(JSON.parse(localStorage.getItem('memberInfo') || 'null'))

  // 計算屬性
  const isLoggedIn = computed(() => !!token.value)
  const memberId = computed(() => memberInfo.value?.memberId || null)
  const fullName = computed(() => memberInfo.value?.fullName || '會員')
  const avatar = computed(() => memberInfo.value?.profilePicture || null)

  /**
   * 登入（設定 Token + 會員資料 → 同步寫入 localStorage）
   * @param {string} newToken - JWT Token
   * @param {object} member - 會員資料 (MemberResponseDTO)
   */
  function login(newToken, member) {
    token.value = newToken
    memberInfo.value = member
    localStorage.setItem('memberToken', newToken)
    localStorage.setItem('memberInfo', JSON.stringify(member))
  }

  /**
   * 登出（清空狀態 + localStorage）
   */
  function logout() {
    token.value = ''
    memberInfo.value = null
    localStorage.removeItem('memberToken')
    localStorage.removeItem('memberInfo')
  }

  return { token, memberInfo, isLoggedIn, memberId, fullName, avatar, login, logout }
})
