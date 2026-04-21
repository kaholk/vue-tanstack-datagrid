import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutPage'),
    },
    {
      path: '/table',
      name: 'table',
      component: () => import('@/views/TablePage'),
    },
  ],
})

export default router
