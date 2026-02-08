<script setup lang="ts">
import { supabase } from '@/lib/supabase';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import type { Announcement } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { computed, onMounted, ref } from 'vue';
import {
  ArrowRightIcon,
  RelationIcon,
  ServerIcon,
} from 'tdesign-icons-vue-next';

const stats = ref({ nodes: 0, tunnels: 0, rules: 0 });
const statsLoading = ref(true);
const announcements = ref<Announcement[]>([]);
const announcementsLoading = ref(true);
const dialogVisible = ref(false);
const selectedAnnouncement = ref<Announcement | null>(null);

const currentDate = computed(() =>
  format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN }),
);

const statsList = computed(() => [
  { key: 'nodes', label: '中继节点', value: stats.value.nodes, icon: ServerIcon },
  { key: 'tunnels', label: '隧道数量', value: stats.value.tunnels, icon: ArrowRightIcon },
  { key: 'rules', label: '转发规则', value: stats.value.rules, icon: RelationIcon },
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

onMounted(() => {
  fetchStats();
  fetchAnnouncements();
});
</script>

<template>
    <t-space direction="vertical" size="large" class="dashboard-container">
      <t-space direction="vertical" size="small">
        <t-typography-title level="h1">欢迎回来</t-typography-title>
        <t-typography-text theme="secondary">{{ currentDate }}</t-typography-text>
      </t-space>

    <t-row :gutter="16">
      <t-col v-for="stat in statsList" :key="stat.key" :xs="12" :md="4">
        <t-card>
        <div v-if="statsLoading">
          <t-skeleton :row-col="[1]" />
        </div>
        <t-statistic v-else :title="stat.label" :value="stat.value">
          <template #prefix>
            <component :is="stat.icon" />
          </template>
        </t-statistic>
        </t-card>
      </t-col>
    </t-row>

    <t-card title="最新公告">
      <div v-if="announcementsLoading">
        <t-skeleton :row-col="[{ width: '80%' }, { width: '70%' }, { width: '60%' }]" />
      </div>

      <t-empty v-else-if="announcements.length === 0" description="暂无公告" />

      <t-list v-else>
        <t-list-item v-for="announcement in announcements" :key="announcement.id" @click="showAnnouncement(announcement)">
          <t-list-item-meta :title="announcement.title" :description="formatDateTime(announcement.created_at)" />
        </t-list-item>
      </t-list>
    </t-card>

    <t-dialog v-model:visible="dialogVisible" :header="selectedAnnouncement?.title" width="600px">
      <div v-if="selectedAnnouncement">
        <t-space direction="vertical" size="medium">
          <span class="meta-text">{{ formatFullDateTime(selectedAnnouncement.created_at) }}</span>
          <MarkdownRenderer :content="selectedAnnouncement.content" />
        </t-space>
      </div>
    </t-dialog>
    </t-space>
</template>

<style scoped>
.dashboard-container {
  width: 100%;
}

.meta-text {
  color: var(--td-text-color-secondary);
  font-size: 12px;
}
</style>
