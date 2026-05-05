/**
 * 揪團 API 模組
 * 對應後端：PickupGameRestController → /api/pickup-games/**
 *          PickupGameSignupsRestController → /api/pickup-game-signups/**
 */
import api from './index'

export const pickupGameApi = {
  // ===== 揪團 CRUD =====
  findAll: () => api.get('/pickup-games'),
  findById: (id) => api.get(`/pickup-games/${id}`),
  create: (game) => api.post('/pickup-games', game),
  update: (id, game) => api.put(`/pickup-games/${id}`, game),
  delete: (id) => api.delete(`/pickup-games/${id}`),

  // GET /api/pickup-games/:gameId/signups — 查詢某場揪團的所有報名
  findSignupsByGameId: (gameId) => api.get(`/pickup-games/${gameId}/signups`),
}

export const pickupGameSignupsApi = {
  // ===== 報名 CRUD =====
  findAll: () => api.get('/pickup-game-signups'),
  findById: (id) => api.get(`/pickup-game-signups/${id}`),
  create: (signup) => api.post('/pickup-game-signups', signup),
  update: (id, signup) => api.put(`/pickup-game-signups/${id}`, signup),
  delete: (id) => api.delete(`/pickup-game-signups/${id}`),
}
