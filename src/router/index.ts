import { supabase } from '@/lib/supabase';
import { type RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/DashboardLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'nodes',
        name: 'Nodes',
        component: () => import('@/views/Nodes.vue'),
        meta: { title: '中继节点' },
      },
      {
        path: 'tunnels',
        name: 'Tunnels',
        component: () => import('@/views/Tunnels.vue'),
        meta: { title: '隧道管理' },
      },
      {
        path: 'announcements',
        name: 'Announcements',
        component: () => import('@/views/Announcements.vue'),
        meta: { title: '系统公告' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  if (to.meta.public) {
    next();
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    next('/login');
  } else {
    next();
  }
});

export default router;
