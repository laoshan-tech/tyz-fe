<script setup lang="ts">
import TunnelsEditDialog from '@/components/TunnelsEditDialog.vue';
import TunnelChainDialog from '@/components/TunnelChainDialog.vue';
import { supabase } from '@/lib/supabase';
import type { Chain, Tunnel } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { h, onMounted, ref, computed } from 'vue';
import {
  AddIcon,
  ArrowRightIcon,
  DeleteIcon,
  EditIcon,
  ErrorTriangleIcon,
  ArrowUpIcon,
} from 'tdesign-icons-vue-next';
import type { PrimaryTableCol, TableRowData } from 'tdesign-vue-next';

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

const columns = computed<PrimaryTableCol<TableRowData>[]>(() => [
  { title: 'ID', colKey: 'id', width: 90, sorter: true },
  { title: '名称', colKey: 'name', width: 200, sorter: true },
  {
    title: '链路配置',
    colKey: 'chains',
    cell: (h, { row }) => {
      const summary = getChainSummary(row as Tunnel);
      if (summary) {
        return h('t-tag', { theme: 'primary' }, { default: () => summary });
      }
      return h('span', { class: 'cell-muted' }, '-');
    },
  },
  {
    title: '创建时间',
    colKey: 'created_at',
    width: 200,
    sorter: true,
    cell: (h, { row }) => {
      return h('span', { class: 'cell-muted' }, formatDateTime((row as Tunnel).created_at));
    },
  },
  {
    title: '操作',
    colKey: 'actions',
    width: 140,
    cell: (h, { row }) => {
      return h('t-space', { size: 'small' }, [
        h(
          't-button',
          {
            size: 'small',
            variant: 'text',
            shape: 'circle',
            onClick: () => viewChain(row as TableRowData),
          },
          { icon: () => h(ArrowUpIcon) },
        ),
        h(
          't-button',
          {
            size: 'small',
            variant: 'text',
            shape: 'circle',
            onClick: () => openEdit(row as TableRowData),
          },
          { icon: () => h(EditIcon) },
        ),
        h(
          't-button',
          {
            size: 'small',
            variant: 'text',
            shape: 'circle',
            theme: 'danger',
            onClick: () => confirmDelete((row as { id: number }).id),
          },
          { icon: () => h(DeleteIcon) },
        ),
      ]);
    },
  },
]);

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizer: true,
  pageSizeOptions: [10, 20, 50],
}));

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

function viewChain(tunnel: TableRowData) {
  selectedChains.value = (tunnel as Tunnel).chains || [];
  chainDialogRef.value?.open();
}

function openEdit(row: TableRowData) {
  editData.value = row as Tunnel;
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

function onPage(nextPage: { current: number; pageSize: number }) {
  page.value = nextPage.current;
  pageSize.value = nextPage.pageSize;
  refreshData();
}

function onSort(sorter: { sortBy?: string; descending?: boolean } | Array<{ sortBy?: string; descending?: boolean }>) {
  const normalized = Array.isArray(sorter) ? sorter[0] : sorter;
  if (normalized?.sortBy) {
    sortBy.value = [
      {
        key: normalized.sortBy,
        order: normalized.descending ? ('desc' as const) : ('asc' as const),
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
  <t-space class="page-container" direction="vertical" size="large">
    <t-space direction="vertical" size="small">
      <t-typography-title level="h1">隧道管理</t-typography-title>
      <t-typography-text theme="secondary">管理隧道配置和链路</t-typography-text>
    </t-space>

    <t-card>
      <t-space direction="vertical" size="small" class="table-wrapper">
        <div class="table-actions">
          <t-button theme="primary" @click="openCreate">
            <template #icon>
              <AddIcon />
            </template>
            新建隧道
          </t-button>
        </div>
        <t-table
          :columns="columns"
          :data="tunnels"
          :pagination="pagination"
          :loading="loading"
          table-layout="fixed"
          row-key="id"
          @page-change="onPage"
          @sort-change="onSort"
        >
          <template #empty>
            <t-empty description="暂无隧道数据">
              <template #icon>
                <ArrowRightIcon />
              </template>
            </t-empty>
          </template>
        </t-table>
      </t-space>
    </t-card>

    <t-dialog v-model:visible="deleteDialog" header="确认删除" width="400px">
      <t-space direction="vertical" align="center" class="dialog-body">
        <ErrorTriangleIcon class="warning-icon" />
        <p class="dialog-text">确定要删除这个隧道吗？此操作不可恢复。</p>
      </t-space>
      <template #footer>
        <t-space align="center" justify="flex-end" class="dialog-footer">
          <t-button @click="deleteDialog = false">取消</t-button>
          <t-button theme="danger" @click="handleDelete">确认删除</t-button>
        </t-space>
      </template>
    </t-dialog>

    <TunnelsEditDialog ref="editDialogRef" :edit-data="editData" @saved="refreshData" />
    <TunnelChainDialog ref="chainDialogRef" :chains="selectedChains" />
  </t-space>
</template>

<style scoped>
.page-container {
  width: 100%;
}

.table-wrapper {
  width: 100%;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.cell-muted {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.dialog-body {
  padding: 12px 0;
}

.warning-icon {
  font-size: 80px;
  color: var(--td-warning-color);
}

.dialog-text {
  margin: 0;
  text-align: center;
  color: var(--td-text-color-secondary);
}
</style>
