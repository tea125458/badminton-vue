
<img width="754" height="538" alt="羽過天晴系統" src="https://github.com/user-attachments/assets/68855d2f-4c4c-422b-b796-436797a9bc7e" />
<img width="1457" height="663" alt="羽過天晴首頁" src="https://github.com/user-attachments/assets/b24347d6-dc15-4461-aae1-9d407d5a470b" />
# 🏸 羽過天晴 — 羽球場館整合管理系統
> 一站式羽球場館平台：場地預約 × 臨打揪團 × 商城購物 × 會員管理
## 📋 專案簡介
「羽過天晴」是一套為實體羽球場館打造的全端整合系統，涵蓋場地預約、臨打揪團、商品商城、會員中心與後台管理等功能模組。本專案由 6 人團隊協作開發，採前後端分離架構。
## 🛠️ 技術棧
| 層級 | 技術 |
|------|------|
| **前端框架** | Vue 3 (Composition API) + Vite |
| **狀態管理** | Pinia |
| **路由** | Vue Router |
| **UI 框架** | Bootstrap 5 + Bootstrap Icons |
| **後端框架** | Spring Boot 3.4 (Java 17) |
| **ORM** | Spring Data JPA / Hibernate |
| **資料庫** | Microsoft SQL Server |
| **認證授權** | JWT (jjwt) + Google OAuth 2.0 |
| **即時通訊** | WebSocket (STOMP) |
| **金流** | LINE Pay API |
| **郵件服務** | Spring Boot Mail (Gmail SMTP) |
| **地圖** | Google Maps Embed API |
| **報表匯出** | xlsx.js / jsPDF / JSON |
## 🏗️ 系統架構
採前後端分離架構，前端 Vue 3 透過 Axios 呼叫後端 Spring Boot RESTful API，
資料庫使用 MS SQL Server，認證採用 JWT Token 機制。
## 🎯 我負責的模組：臨打揪團系統
### 解決的問題
球友預約場地後若有多餘名額，傳統只能在 LINE / FB 社團貼文揪人，資訊分散且管理困難。本模組讓會員直接在平台上完成 **開團 → 搜尋 → 報名 → 管理**，一站式解決。
### ✨ 核心亮點
#### 🔥 亮點 1：三層智慧防呆機制
在報名流程中設計了三道嚴格的攔截邏輯，確保每場活動的品質：
| 防呆層級 | 攔截邏輯 | 說明 |
|---------|---------|------|
| 第一層 | **性別防呆** | 男性無法報名「限女性」場次，反之亦然 |
| 第二層 | **程度防呆** | 初級球友無法報名「限高級」場次 |
| 第三層 | **時段衝突** | 系統比對使用者所有預約與報名紀錄，防止時間重疊 |
#### 🔥 亮點 2：發起揪團自動帶入預約
會員點擊「發起揪團」時，系統會自動偵測其最近的場地預約，並將日期、時段、場館資訊一鍵帶入，免去手動重填的麻煩。
#### 🔥 亮點 3：Privacy by Default 預設隱私保護
- 所有通知（公告、踢除、取消）皆由**系統代發 Email**，雙方個資零洩漏
- 球友聯絡主揪透過平台信封按鈕，不需互加 LINE
- 被移除的球友，如有疑問可透過**官方客服信箱**協助處理，由平台公正介入
#### 🔥 亮點 4：後台代客報名（軟性警告機制）
前台嚴格攔截不符資格的報名；後台則轉換為**軟性提示**，讓管理員可根據現場情況「特例放行」，在系統嚴謹度與營運彈性間取得平衡。
### 📦 模組檔案結構
**前端 (Vue 3)**
- `PickupGamePage.vue` — 揪團大廳（日期篩選、進階篩選、快速預覽）
- `PickupGameDetail.vue` — 揪團詳情頁（報名、聯絡主揪、Google Maps）
- `PickupGameRow.vue` — 揪團卡片元件（進度條、狀態標籤）
- `CreateGameModal.vue` — 發起揪團彈窗（自動帶入預約）
- `ManageMatchModal.vue` — 主揪管理彈窗（群發公告、踢除成員）
- `SignupPanel.vue` — 報名面板（程度選擇、同意條款）
- `usePickupGameApi.js` — API 組合式函數（CRUD、報名、踢除）
- `useTimeConflict.js` — 時間衝突檢查邏輯
- `useGameFilter.js` — 多條件篩選與排序
- `useExport.js` — 報表匯出（Excel / PDF / JSON）
- `PickupGameManage.vue` — 後台管理（代客報名、軟刪除、匯出）
**後端 (Spring Boot)**
- `PickupGameRestController.java` — RESTful API（含群發公告、聯絡主揪）
- `PickupGamesService.java` — 商業邏輯（含取消揪團自動通知）
- `PickupGameSignupsService.java` — 報名邏輯（三層防呆、時間衝突）
- `PickupGameEmailService.java` — Email 服務（公告、移除、取消、聯絡主揪）
- `PickupGames.java` — JPA Entity
- `PickupGameSignups.java` — JPA Entity
## 👥 團隊成員
| 成員 | 負責模組 |
|------|---------|
| 徐蕊薇 | 臨打揪團系統（前後端） |
| *(其他組員)* | 場地預約 / 商城 / 會員 / 公告 / 後台管理 |
## 📸 畫面截圖
### 揪團大廳
<img width="1386" height="692" alt="揪團大廳" src="https://github.com/user-attachments/assets/0798c527-41a3-42c1-97bf-2635262a6a0a" />
### 三層防呆機制
<img width="844" height="536" alt="防呆彈窗" src="https://github.com/user-attachments/assets/fe016dac-5988-4281-ac9c-435247af4283" />
### Privacy by Default — Email 通知
<img width="695" height="507" alt="Gmail收信" src="https://github.com/user-attachments/assets/4a5623e2-15bc-43f5-9844-6339e274875e" />
### 後台代客報名（軟性警告）
<img width="1470" height="651" alt="後台代客報名" src="https://github.com/user-attachments/assets/0ddd916f-9786-4e8f-8650-6c75310b28ff" />
## 🚀 如何啟動
### 環境需求
| 項目 | 版本 |
|------|------|
| Java | JDK 17+ |
| Node.js | 20.19+ |
| 資料庫 | Microsoft SQL Server |
| IDE | IntelliJ IDEA (後端) / VS Code (前端) |
### 後端（Spring Boot）
1. 使用 IntelliJ IDEA 開啟 `badminton-system`
2. 等待 Maven 自動下載依賴
3. 確認 `src/main/resources/application.yml` 資料庫連線設定
4. 執行 `BadmintonApplication.java` 的 `main()` 方法
5. 後端啟動於 `http://localhost:8080`
### 前端（Vue 3 + Vite）
```bash
cd badminton-vue
npm install
npm run dev
