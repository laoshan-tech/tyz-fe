<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { useTenantStore } from '@/stores/tenant';
import type { Tenant } from '@/types';
import { computed, onMounted, inject, type Ref, ref, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DashboardIcon,
  LogoutIcon,
  MoonIcon,
  ServerIcon,
  SunnyIcon,
  LoudspeakerIcon,
  ArrowRightIcon,
  UserIcon,
} from 'tdesign-icons-vue-next';

const route = useRoute();
const router = useRouter();
const { user, loading: authLoading, isAuthenticated, initialize, signOut } = useAuth();
const tenantStore = useTenantStore();
const isCollapsed = ref(false);

const iconMap: Record<string, any> = {
  dashboard: DashboardIcon,
  Nodes: ServerIcon,
  Announcements: LoudspeakerIcon,
  Tunnels: ArrowRightIcon,
};

// 主题切换
const isDark = inject<Ref<boolean>>('isDark');
const toggleTheme = inject<() => void>('toggleTheme');

// 计算当前激活的菜单项（支持多级路由）
const activeMenuKey = computed(() => {
  const layoutRoute = router.getRoutes().find(r => r.path === '/');
  if (!layoutRoute?.children) return route.path;

  const matched = layoutRoute.children.find(child => {
    const childPath = '/' + child.path;
    return route.path === childPath || route.path.startsWith(childPath + '/');
  });

  return matched ? '/' + matched.path : route.path;
});

const menuItems = computed(() => {
  const layoutRoute = router.getRoutes().find(r => r.path === '/');
  if (!layoutRoute?.children) return [];

  return layoutRoute.children.map(child => ({
    path: '/' + child.path,
    title: child.meta?.title as string || child.name as string || '',
    icon: iconMap[child.name as string] || DashboardIcon,
  }));
});


const tenantMenuOptions = computed(() =>
  tenantStore.tenants.map((tenant: Tenant) => ({
    content: tenant.name,
    value: tenant.id,
  })),
);

const userMenuOptions = [
  { content: '退出登录', value: 'logout', prefixIcon: () => h(LogoutIcon) },
];

function handleMenuSelect(key: string | number) {
  router.push(String(key));
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

function handleTenantSelect(option: number | { value?: number }) {
  const selectedValue = typeof option === 'number' ? option : option.value;
  if (typeof selectedValue !== 'number') return;
  const tenant = tenantStore.tenants.find((t) => t.id === selectedValue);
  if (tenant) {
    tenantStore.setCurrentTenant(tenant);
  }
}

function handleUserMenuSelect(option: string | number | { value?: string | number }) {
  const selectedValue = typeof option === 'object' ? option.value : option;
  if (selectedValue === 'logout') {
    signOut();
    router.push('/login');
  }
}

onMounted(() => {
  initialize();
  tenantStore.fetchTenants();
});
</script>

<template>
  <t-layout class="layout-wrapper">
    <t-aside :width="isCollapsed ? '72px' : '280px'" class="layout-aside">
      <t-menu :value="activeMenuKey" :collapsed="isCollapsed" @change="handleMenuSelect">
        <template #logo>
          <div class="aside-logo">
            <span v-show="!isCollapsed">TYZ Panel</span>
            <span v-show="isCollapsed" class="collapsed-logo">T</span>
          </div>
        </template>
        <t-menu-item v-for="item in menuItems" :key="item.path" :value="item.path">
          <template #icon>
            <component :is="item.icon" />
          </template>
          {{ item.title }}
        </t-menu-item>
        <template #operations>
          <t-button variant="text" shape="circle" size="small" @click="toggleCollapse">
            <component :is="isCollapsed ? ChevronRightIcon : ChevronLeftIcon" />
          </t-button>
        </template>
      </t-menu>
    </t-aside>

    <t-layout>
      <t-header class="layout-header">
        <div class="header-wrapper">
          <t-space align="center" size="medium" class="header-actions">
            <!-- 主题切换 -->
            <t-button theme="default" variant="text" shape="circle" @click="toggleTheme">
              <component :is="isDark ? SunnyIcon : MoonIcon" />
            </t-button>

            <!-- 租户选择 -->
            <t-dropdown :options="tenantMenuOptions" trigger="click" @click="handleTenantSelect">
              <t-button variant="text" class="tenant-button">
                {{ tenantStore.currentTenant?.name || '选择租户' }}
                <ChevronDownIcon class="tenant-chevron" />
              </t-button>
            </t-dropdown>

            <!-- 用户菜单 -->
            <template v-if="!authLoading && isAuthenticated">
              <t-dropdown :options="userMenuOptions" @click="handleUserMenuSelect">
                <t-space align="center" size="small" class="user-trigger">
                  <t-avatar shape="circle" size="32px">
                    <template #icon>
                      <UserIcon />
                    </template>
                  </t-avatar>
                  <span>{{ user?.email || '用户' }}</span>
                </t-space>
              </t-dropdown>
            </template>
            <t-skeleton v-else theme="avatar" />
          </t-space>
        </div>
      </t-header>

      <t-content class="layout-content">
        <div class="main-container">
          <router-view />
        </div>
      </t-content>
    </t-layout>
  </t-layout>
</template>

<style scoped>
.layout-aside {
  height: 100vh;
}

.layout-aside :deep(.t-default-menu) {
  width: 100% !important;
}

.layout-aside :deep(.t-menu) {
  width: 100%;
}

.aside-logo {
  font-weight: 600;
  font-size: 18px;
  white-space: nowrap;
}

.collapsed-logo {
  font-weight: bold;
  font-size: 20px;
}

.layout-header {
  padding: 12px 24px;
}

.header-wrapper {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

.header-actions {
  justify-content: flex-end;
}

.user-trigger {
  cursor: pointer;
}

.layout-content {
  padding: 0;
}

.layout-wrapper {
  height: 100vh;
  overflow: hidden;
}

.tenant-button {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tenant-chevron {
  margin-left: 6px;
}

.main-container {
  max-width: 1688px;
  margin: 0 auto;
  padding: 24px;
  min-height: calc(100vh - 64px);
}
</style>
