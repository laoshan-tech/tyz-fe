<script setup lang="ts">
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { onMounted, ref } from 'vue';
import { CalendarIcon } from 'tdesign-icons-vue-next';

const announcements = ref<Announcement[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const selectedAnnouncement = ref<Announcement | null>(null);

function formatDateTime(date: string): string {
  return format(new Date(date), 'yyyy年MM月dd日', { locale: zhCN });
}

function formatFullDateTime(date: string): string {
  return format(new Date(date), 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
}

function showAnnouncement(announcement: Announcement) {
  selectedAnnouncement.value = announcement;
  dialogVisible.value = true;
}

async function fetchAnnouncements() {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    announcements.value = data as Announcement[];
  } catch (err) {
    console.error('Failed to fetch announcements:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchAnnouncements();
});
</script>

<template>
  <t-space direction="vertical" size="large" class="page-container">
    <t-space direction="vertical" size="small">
      <t-typography-title level="h1">系统公告</t-typography-title>
      <t-typography-text theme="secondary">查看系统更新和重要通知</t-typography-text>
    </t-space>

    <div v-if="loading" class="centered-block">
      <t-loading size="large" />
    </div>

    <t-empty v-else-if="announcements.length === 0" description="暂无公告" />

    <t-list v-else>
      <t-list-item v-for="announcement in announcements" :key="announcement.id" @click="showAnnouncement(announcement)">
        <t-list-item-meta :title="announcement.title" :description="formatDateTime(announcement.created_at)" />
      </t-list-item>
    </t-list>

    <t-dialog v-model:visible="dialogVisible" :header="selectedAnnouncement?.title" width="800px">
      <div v-if="selectedAnnouncement">
        <t-space direction="vertical" size="medium">
          <t-space align="center" size="small">
            <CalendarIcon size="16" />
            <span class="meta-text">{{ formatFullDateTime(selectedAnnouncement.created_at) }}</span>
          </t-space>
          <MarkdownRenderer :content="selectedAnnouncement.content" />
        </t-space>
      </div>
    </t-dialog>
  </t-space>
</template>

<style scoped>
.page-container {
  width: 100%;
}

.meta-text {
  color: var(--td-text-color-secondary);
  font-size: 12px;
}

.centered-block {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
</style>
