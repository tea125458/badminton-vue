import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ============================
    // 🟢 前台（使用者）
    // ============================
    {
      path: '/',
      component: () => import('@/layouts/FrontLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/frontend/HomePage.vue') },
        { path: 'products', name: 'products', component: () => import('@/views/frontend/ProductBrowse.vue') },
        { path: 'booking', name: 'booking', component: () => import('@/views/frontend/BookingPage.vue') },
        { path: 'pickup', name: 'pickup', component: () => import('@/views/frontend/PickupGamePage.vue') },
        { path: 'login', name: 'memberLogin', component: () => import('@/views/frontend/MemberLogin.vue') },
        { path: 'register', name: 'memberRegister', component: () => import('@/views/frontend/MemberRegister.vue') },
        { path: 'reset-password', name: 'resetPassword', component: () => import('@/views/frontend/MemberResetPwd.vue') },
        { path: 'profile', name: 'profile', component: () => import('@/views/frontend/MemberProfile.vue') },
        { path: 'cart', name: 'cart', component: () => import('@/views/frontend/Cart.vue') },
        { path: 'checkout', name: 'checkout', component: () => import('@/views/frontend/Checkout.vue') },
        { path: 'order-success', name: 'orderSuccess', component: () => import('@/views/frontend/OrderSuccess.vue') },
        { path: 'my-orders', name: 'myOrders', component: () => import('@/views/frontend/MyOrders.vue') },
      ],
    },

    // ============================
    // 🔵 後台（管理者）
    // ============================
    {
      path: '/admin/login',
      name: 'adminLogin',
      component: () => import('@/views/admin/AdminLogin.vue'),
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/admin/members' },
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/admin/Dashboard.vue') },
        { path: 'members', name: 'memberManage', component: () => import('@/views/admin/MemberManage.vue') },
        { path: 'admins', name: 'adminManage', component: () => import('@/views/admin/AdminManage.vue') },
        { path: 'profile', name: 'adminProfile', component: () => import('@/views/admin/AdminProfile.vue') },
        { path: 'venues', name: 'venueManage', component: () => import('@/views/admin/VenueManage.vue') },
        { path: 'courts', name: 'courtManage', component: () => import('@/views/admin/CourtManage.vue') },
        { path: 'bookings', name: 'bookingManage', component: () => import('@/views/admin/BookingManage.vue') },
        { path: 'products', name: 'productManage', component: () => import('@/views/admin/ProductManage.vue') },
        { path: 'orders', name: 'orderManage', component: () => import('@/views/admin/OrderManage.vue') },
        { path: 'announcements', name: 'announcementManage', component: () => import('@/views/admin/AnnouncementManage.vue') },
        { path: 'pickup-games', name: 'pickupGameManage', component: () => import('@/views/admin/PickupGameManage.vue') },
      ],
    },
  ],
})

export default router
