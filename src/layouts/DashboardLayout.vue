<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { useTenantStore } from '@/stores/tenant';
import type { Tenant } from '@/types';
import {
  NAvatar,
  NButton,
  NDropdown,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NSkeleton,
} from 'naive-ui';
import type { MenuOption } from 'naive-ui';
import { computed, h, onMounted, inject, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@vicons/utils';
import { Home, Sunny, Moon, ServerOutline, MegaphoneOutline, ArrowForward } from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const { user, loading: authLoading, isAuthenticated, initialize, signOut } = useAuth();
const tenantStore = useTenantStore();

const iconMap: Record<string, any> = {
  'dashboard': Home,
  'Nodes': ServerOutline,
  'Announcements': MegaphoneOutline,
  'Tunnels': ArrowForward,
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
    icon: iconMap[child.name as string] || Home,
  }));
});

const menuOptions = computed<MenuOption[]>(() =>
  menuItems.value.map((item) => ({
    label: item.title,
    key: item.path,
    icon: () => h(Icon, { size: 18 }, { default: () => h(item.icon) }),
  })),
);

const tenantMenuOptions = computed(() =>
  tenantStore.tenants.map((tenant: Tenant) => ({
    label: tenant.name,
    key: tenant.id,
  })),
);

const userMenuOptions = [
  { type: 'divider' },
  { label: '退出登录', key: 'logout' },
];

function handleMenuSelect(key: string) {
  router.push(key);
}

function handleTenantSelect(key: number) {
  const tenant = tenantStore.tenants.find((t) => t.id === key);
  if (tenant) {
    tenantStore.setCurrentTenant(tenant);
  }
}

function handleUserMenuSelect(key: string) {
  if (key === 'logout') {
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
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider bordered collapse-mode="width" :collapsed-width="72" :width="280" show-trigger>
      <div style="padding: 16px; border-bottom: 1px solid var(--n-border-color)">
        <h3 style="margin: 0; text-align: center">TYZ Panel</h3>
      </div>

      <n-menu :value="activeMenuKey" :collapsed-width="72" :collapsed-icon-size="20" :options="menuOptions"
        @update:value="handleMenuSelect" style="flex: 1" />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered style="padding: 12px 16px; display: flex; justify-content: flex-end">
        <div style="display: flex; align-items: center; gap: 12px">
          <!-- 主题切换 -->
          <n-button quaternary circle @click="toggleTheme">
            <template #icon>
              <Icon size="18">
                <component :is="isDark ? Sunny : Moon" />
              </Icon>
            </template>
          </n-button>

          <!-- 租户选择 -->
          <n-dropdown :options="tenantMenuOptions" trigger="click" @select="handleTenantSelect">
            <n-button quaternary>
              <n-avatar size="small" style="margin-right: 8px" />
              {{ tenantStore.currentTenant?.name || '选择租户' }}
            </n-button>
          </n-dropdown>

          <!-- 用户菜单 -->
          <template v-if="!authLoading && isAuthenticated">
            <n-dropdown :options="userMenuOptions" @select="handleUserMenuSelect">
              <div style="display: flex; align-items: center; gap: 8px; cursor: pointer">
                <n-avatar round :size="32" />
                <span>{{ user?.email || '用户' }}</span>
              </div>
            </n-dropdown>
          </template>
          <n-skeleton v-else circle size="medium" />
        </div>
      </n-layout-header>

      <n-layout-content style="max-width: 1600px; margin: 0 auto; padding: 0;">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
