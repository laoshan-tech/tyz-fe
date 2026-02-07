<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NSpace,
  NTag,
  type DataTableColumns,
  type DataTableRowKey,
} from 'naive-ui';
import TunnelsEditDialog from '@/components/TunnelsEditDialog.vue';
import TunnelChainDialog from '@/components/TunnelChainDialog.vue';
import { supabase } from '@/lib/supabase';
import type { Chain, Tunnel } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { h, onMounted, ref, computed } from 'vue';
import {
  Add,
  Create,
  TrashOutline,
  ArrowUp,
  ArrowForward,
  WarningOutline,
} from '@vicons/ionicons5';

const tunnels = ref<Tunnel[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([{ key: 'created_at', order: 'desc' }]);
const deleteDialog = ref(false);
const deleteId = ref<number | null>(null);
const selectedChains = ref<Chain[]>([]);
const editDialogRef = ref<InstanceType<typeof TunnelsEditDialog> | null>(null);
const chainDialogRef = ref<InstanceType<typeof TunnelChainDialog> | null>(null);
const editData = ref<Tunnel | null>(null);

const columns = computed<DataTableColumns<Tunnel>>(() => [
  { title: 'ID', key: 'id', width: 80, sorter: 'default' },
  { title: '名称', key: 'name', sorter: 'default' },
  {
    title: '链路配置',
    key: 'chains',
    render: (row) => {
      const summary = getChainSummary(row);
      if (summary) {
        return h(NTag, { type: 'info' }, { default: () => summary });
      }
      return h('span', { style: 'font-size: 13px; color: #999;' }, '-');
    },
  },
  {
    title: '创建时间',
    key: 'created_at',
    width: 180,
    sorter: 'default',
    render: (row) => {
      return h('span', { style: 'font-size: 13px; color: #999;' }, formatDateTime(row.created_at));
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => {
      return h('div', { style: 'display: flex; gap: 8px;' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            onClick: () => viewChain(row),
          },
          { icon: () => h(ArrowUp, { style: 'font-size: 16px;' }) },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            onClick: () => openEdit(row),
          },
          { icon: () => h(Create, { style: 'font-size: 16px;' }) },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            type: 'error',
            onClick: () => confirmDelete(row.id),
          },
          { icon: () => h(TrashOutline, { style: 'font-size: 16px;' }) },
        ),
      ]);
    },
  },
]);

const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
}));

function rowKey(row: Tunnel): DataTableRowKey {
  return row.id;
}

function formatDateTime(date: string): string {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

function getChainSummary(tunnel: Tunnel): string {
  if (!tunnel.chains || tunnel.chains.length === 0) return '';
  const ingressCount = tunnel.chains.filter((c) => c.chain_type === 'in').length;
  const chainCount = tunnel.chains.filter((c) => c.chain_type === 'chain').length;
  const egressCount = tunnel.chains.filter((c) => c.chain_type === 'out').length;
  const parts: string[] = [];
  if (ingressCount > 0) parts.push('入口');
  if (chainCount > 0) parts.push(`${chainCount}跳`);
  if (egressCount > 0) parts.push('出口');
  return parts.join(' → ');
}

function viewChain(tunnel: Tunnel) {
  selectedChains.value = tunnel.chains || [];
  chainDialogRef.value?.open();
}

function openEdit(row: Tunnel) {
  editData.value = row;
  editDialogRef.value?.open();
}

function openCreate() {
  editData.value = null;
  editDialogRef.value?.open();
}

function confirmDelete(id: number) {
  deleteId.value = id;
  deleteDialog.value = true;
}

async function handleDelete() {
  if (!deleteId.value) return;
  try {
    await supabase.from('tunnels').delete().eq('id', deleteId.value);
    refreshData();
  } finally {
    deleteDialog.value = false;
    deleteId.value = null;
  }
}

function onPage(nextPage: number) {
  page.value = nextPage;
  refreshData();
}

function onSort(sorter: { columnKey?: string; order?: string } | null) {
  if (sorter?.columnKey) {
    sortBy.value = [
      {
        key: sorter.columnKey,
        order: sorter.order === 'ascend' ? ('asc' as const) : ('desc' as const),
      },
    ];
  }
  refreshData();
}

async function refreshData() {
  loading.value = true;
  try {
    const start = (page.value - 1) * pageSize.value;
    const end = start + pageSize.value - 1;
    let query = supabase
      .from('tunnels')
      .select('*, chains(*, node:relay_nodes(*))', { count: 'exact' })
      .range(start, end);
    if (sortBy.value.length > 0) {
      for (const sort of sortBy.value) {
        query = query.order(sort.key, { ascending: sort.order === 'asc' });
      }
    }
    const { data, error, count } = await query;
    if (error) throw error;
    tunnels.value = data || [];
    total.value = count || 0;
  } catch (err) {
    console.error('Failed to fetch tunnels:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refreshData();
});
</script>

<template>
  <div style="padding: 24px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h1 style="margin: 0; font-size: 24px;">隧道管理</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #999;">管理隧道配置和链路</p>
      </div>
      <n-button type="primary" @click="openCreate">
        <template #icon>
          <Add style="font-size: 16px;" />
        </template>
        新建隧道
      </n-button>
    </div>

    <n-card>
      <n-data-table
        :columns="columns"
        :data="tunnels"
        :pagination="pagination"
        :row-key="rowKey"
        :loading="loading"
        :striped="true"
        @update:page="onPage"
        @update:sorter="onSort"
      >
        <template #empty>
          <div style="text-align: center; padding: 60px 0; color: #999;">
            <ArrowForward style="font-size: 64px; margin-bottom: 16px;" />
            <div style="font-size: 14px;">暂无隧道数据</div>
          </div>
        </template>
      </n-data-table>
    </n-card>

    <n-modal v-model:show="deleteDialog" preset="card" :style="{ width: '400px' }">
      <template #header>确认删除</template>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0;">
        <WarningOutline style="font-size: 80px; color: #eab308;" />
        <p style="margin: 0; text-align: center; color: #666;">确定要删除这个隧道吗？此操作不可恢复。</p>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="deleteDialog = false">取消</n-button>
          <n-button type="error" @click="handleDelete">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <TunnelsEditDialog ref="editDialogRef" :edit-data="editData" @saved="refreshData" />
    <TunnelChainDialog ref="chainDialogRef" :chains="selectedChains" />
  </div>
</template>
