<script setup lang="ts">
import { supabase } from '@/lib/supabase';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import type { Announcement } from '@/types';
import {
  NButton,
  NCard,
  NModal,
  NSkeleton,
  NStatistic,
  NList,
  NListItem,
  NThing,
  NEmpty,
} from 'naive-ui';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { computed, onMounted, ref } from 'vue';
import { Icon } from '@vicons/utils';
import { Desktop, ArrowForward, GitBranch, Megaphone, Refresh } from '@vicons/ionicons5';

const stats = ref({ nodes: 0, tunnels: 0, rules: 0 });
const statsLoading = ref(true);
const loading = ref(false);
const announcements = ref<Announcement[]>([]);
const announcementsLoading = ref(true);
const dialogVisible = ref(false);
const selectedAnnouncement = ref<Announcement | null>(null);

const currentDate = computed(() =>
  format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN }),
);

const statsList = computed(() => [
  { key: 'nodes', label: '中继节点', value: stats.value.nodes, icon: Desktop },
  { key: 'tunnels', label: '隧道数量', value: stats.value.tunnels, icon: ArrowForward },
  { key: 'rules', label: '转发规则', value: stats.value.rules, icon: GitBranch },
]);

function formatDateTime(date: string): string {
  return format(new Date(date), 'MM月dd日 HH:mm', { locale: zhCN });
}

function formatFullDateTime(date: string): string {
  return format(new Date(date), 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
}

function showAnnouncement(announcement: Announcement) {
  selectedAnnouncement.value = announcement;
  dialogVisible.value = true;
}

async function fetchStats() {
  statsLoading.value = true;
  try {
    const [nodesRes, tunnelsRes, rulesRes] = await Promise.all([
      supabase.from('relay_nodes').select('id', { count: 'exact', head: true }),
      supabase.from('tunnels').select('id', { count: 'exact', head: true }),
      supabase.from('relay_rules').select('id', { count: 'exact', head: true }),
    ]);
    stats.value = {
      nodes: nodesRes.count ?? 0,
      tunnels: tunnelsRes.count ?? 0,
      rules: rulesRes.count ?? 0,
    };
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  } finally {
    statsLoading.value = false;
  }
}

async function fetchAnnouncements() {
  announcementsLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    announcements.value = data as Announcement[];
  } catch (err) {
    console.error('Failed to fetch announcements:', err);
  } finally {
    announcementsLoading.value = false;
  }
}

async function refreshData() {
  loading.value = true;
  await Promise.all([fetchStats(), fetchAnnouncements()]);
  loading.value = false;
}

onMounted(() => {
  fetchStats();
  fetchAnnouncements();
});
</script>

<template>
  <div class="dashboard-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 24px;">欢迎回来</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #999;">{{ currentDate }}</p>
      </div>
      <n-button quaternary circle @click="refreshData" :loading="loading">
        <template #icon>
          <Icon size="20">
            <Refresh />
          </Icon>
        </template>
      </n-button>
    </div>

    <div class="stats-grid">
      <n-card v-for="stat in statsList" :key="stat.key">
        <div v-if="statsLoading">
          <n-skeleton text :repeat="2" />
        </div>
        <n-statistic v-else :label="stat.label">
          <template #prefix>
            <Icon size="16">
              <component :is="stat.icon" />
            </Icon>
          </template>
          {{ stat.value }}
        </n-statistic>
      </n-card>
    </div>

    <n-card title="最新公告">
      <div v-if="announcementsLoading">
        <n-skeleton text :repeat="3" />
      </div>

      <n-empty v-else-if="announcements.length === 0" description="暂无公告" />

      <n-list v-else hoverable clickable>
        <n-list-item
          v-for="announcement in announcements"
          :key="announcement.id"
          @click="showAnnouncement(announcement)"
        >
          <n-thing
            :title="announcement.title"
            :description="formatDateTime(announcement.created_at)"
          >
            <template #avatar>
              <Icon size="20" style="color: #2080f0">
                <Megaphone />
              </Icon>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-card>

    <n-modal
      v-model:show="dialogVisible"
      preset="card"
      :title="selectedAnnouncement?.title"
      style="width: 600px; max-width: 90vw"
    >
      <div v-if="selectedAnnouncement">
        <p style="color: #666; font-size: 12px; margin-bottom: 16px">
          {{ formatFullDateTime(selectedAnnouncement.created_at) }}
        </p>
        <MarkdownRenderer :content="selectedAnnouncement.content" />
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
</style>
