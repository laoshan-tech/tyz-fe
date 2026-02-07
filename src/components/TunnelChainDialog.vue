<script setup lang="ts">
import type { Chain } from '@/types';
import { computed, ref } from 'vue';
import {
  NButton,
  NCard,
  NModal,
  NSpace,
  NTag,
} from 'naive-ui';
import { LogIn, LogOut, ArrowForward, InformationCircle } from '@vicons/ionicons5';

const props = defineProps<{
  chains?: Chain[];
}>();

const visible = ref(false);

const sortedChains = computed(() => {
  if (!props.chains) return [];
  return [...props.chains].sort((a, b) => {
    const typeOrder: Record<string, number> = { in: 0, chain: 1, out: 2 };
    const typeDiff = (typeOrder[a.chain_type] ?? 1) - (typeOrder[b.chain_type] ?? 1);
    if (typeDiff !== 0) return typeDiff;
    return a.index - b.index;
  });
});

function open() {
  visible.value = true;
}

function close() {
  visible.value = false;
}

function getIcon(type: string) {
  const icons: Record<string, unknown> = {
    in: LogIn,
    chain: ArrowForward,
    out: LogOut,
  };
  return icons[type] || InformationCircle;
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = { in: '入口', chain: '中继', out: '出口' };
  return labels[type] || '未知';
}

function getTypeSeverity(type: string): 'info' | 'success' | 'warning' {
  const severities: Record<string, 'info' | 'success' | 'warning'> = {
    in: 'success',
    chain: 'info',
    out: 'warning',
  };
  return severities[type] || 'info';
}

defineExpose({ open });
</script>

<template>
  <n-modal v-model:show="visible" preset="card" :style="{ width: '600px' }">
    <template #header>
      链路详情
    </template>

    <div v-if="!chains || chains.length === 0" style="text-align: center; padding: 40px 0; color: #999;">
      <InformationCircle style="font-size: 64px; margin-bottom: 16px;" />
      <div style="font-size: 14px;">暂无链路配置</div>
    </div>

    <div v-else style="display: flex; flex-direction: column; gap: 12px;">
      <div v-for="(chain, index) in sortedChains" :key="chain.id || index" style="display: flex; gap: 12px;">
        <div style="width: 44px; display: flex; flex-direction: column; align-items: center;">
          <div
            :style="{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              background: chain.chain_type === 'in' ? '#22c55e' : chain.chain_type === 'out' ? '#f59e0b' : '#3b82f6',
            }"
          >
            <component :is="getIcon(chain.chain_type)" style="font-size: 20px;" />
          </div>
          <div
            v-if="index < sortedChains.length - 1"
            style="flex: 1; width: 2px; margin: 8px 0; background: var(--n-border-color);"
          />
        </div>

        <n-card :bordered="true" style="flex: 1;">
          <template #header>
            <div style="display: flex; align-items: center; gap: 8px;">
              <n-tag :type="getTypeSeverity(chain.chain_type)">
                {{ getTypeLabel(chain.chain_type) }}
              </n-tag>
              <span v-if="chain.chain_type === 'chain'" style="font-size: 13px; color: #999;">
                第{{ chain.index }}跳
              </span>
            </div>
          </template>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 13px; color: #999;">节点</span>
              <span style="font-weight: 600;">{{ chain.node?.name || '未知节点' }}</span>
            </div>
            <div style="font-size: 13px; color: #666; font-family: monospace;">
              {{ chain.node?.address || '-' }}
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 13px; color: #999;">端口</span>
              <span style="font-weight: 600;">{{ chain.port || '-' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 13px; color: #999;">协议</span>
              <span style="font-weight: 600;">{{ chain.transport }}</span>
            </div>
            <div v-if="chain.strategy" style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; color: #999;">策略</span>
              <n-tag type="info">{{ chain.strategy }}</n-tag>
            </div>
          </div>
        </n-card>
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="close">关闭</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
