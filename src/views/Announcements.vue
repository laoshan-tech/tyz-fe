<script setup lang="ts">
import {
  NCard,
  NIcon,
  NModal,
  NSpin,
} from 'naive-ui';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { onMounted, ref } from 'vue';
import {
  Megaphone,
  ArchiveOutline,
  ChevronForward,
  CalendarOutline,
} from '@vicons/ionicons5';

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
  <div style="padding: 24px;">
    <div style="margin-bottom: 24px;">
      <h1 style="margin: 0; font-size: 24px;">系统公告</h1>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #999;">查看系统更新和重要通知</p>
    </div>

    <div v-if="loading" style="display: flex; justify-content: center; padding: 60px 0;">
      <n-spin size="large" />
    </div>

    <div v-else-if="announcements.length === 0" style="text-align: center; padding: 60px 0; color: #ccc;">
      <n-icon :size="32" style="margin-bottom: 16px;">
        <ArchiveOutline />
      </n-icon>
      <div style="font-size: 14px;">暂无公告</div>
    </div>

    <div v-else style="display: flex; flex-direction: column; gap: 16px;">
      <n-card
        v-for="(announcement, index) in announcements"
        :key="announcement.id"
        style="cursor: pointer; transition: all 0.2s;"
        hoverable
        @click="showAnnouncement(announcement)"
      >
        <div style="display: flex; align-items: center; gap: 16px;">
          <div
            style="
              width: 40px;
              height: 40px;
              border-radius: 12px;
              background: #3b82f6;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
            "
          >
            <n-icon :size="20">
              <Megaphone />
            </n-icon>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600;">{{ announcement.title }}</div>
            <div style="font-size: 13px; color: #999; margin-top: 4px;">{{ formatDateTime(announcement.created_at) }}</div>
          </div>
          <n-icon :size="16" color="#999">
            <ChevronForward />
          </n-icon>
        </div>
      </n-card>
    </div>

    <n-modal v-model:show="dialogVisible" preset="card" :style="{ width: '800px' }">
      <template #header>
        {{ selectedAnnouncement?.title }}
      </template>
      <div v-if="selectedAnnouncement">
        <div
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #999;
            padding-bottom: 12px;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--n-border-color);
          "
        >
          <n-icon :size="16">
            <CalendarOutline />
          </n-icon>
          <span>{{ formatFullDateTime(selectedAnnouncement.created_at) }}</span>
        </div>
        <MarkdownRenderer :content="selectedAnnouncement.content" />
      </div>
    </n-modal>
  </div>
</template>
