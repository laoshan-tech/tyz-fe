<script setup lang="ts">
import NodesEditDialog from '@/components/NodesEditDialog.vue';
import { useDataStore } from '@/stores/data';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { h, onMounted, ref, computed } from 'vue';
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  ErrorTriangleIcon,
  ServerIcon,
} from 'tdesign-icons-vue-next';
import type { PrimaryTableCol, TableRowData } from 'tdesign-vue-next';
import type { RelayNode } from '@/types';

const dataStore = useDataStore();
const deleteDialog = ref(false);
const deleteId = ref<number | null>(null);
const editDialogRef = ref<InstanceType<typeof NodesEditDialog> | null>(null);
const editData = ref<RelayNode | null>(null);

const columns = computed<PrimaryTableCol<TableRowData>[]>(() => [
  { title: 'ID', colKey: 'id', width: 70, sorter: true },
  { title: '名称', colKey: 'name', width: 160, sorter: true },
  {
    title: '地址',
    colKey: 'address',
    width: 220,
    sorter: true,
  },
  {
    title: '级别',
    colKey: 'level',
    width: 110,
    sorter: true,
    cell: (h, { row }) => {
      const severity = getLevelSeverity((row as { level: number }).level);
      return h('t-tag', { theme: severity }, { default: () => `Lv.${(row as { level: number }).level}` });
    },
  },
  {
    title: '状态',
    colKey: 'is_public',
    width: 120,
    sorter: true,
    cell: (h, { row }) => {
      return h(
        'div',
        { style: 'display: flex; align-items: center; gap: 8px;' },
        [
          h('span', {
            style: `width: 8px; height: 8px; border-radius: 50%; background: ${(row as { is_public: boolean }).is_public ? '#00a870' : '#94a3b8'};`,
          }),
          h('span', { style: 'font-size: 13px;' }, (row as { is_public: boolean }).is_public ? '公开' : '私有'),
        ],
      );
    },
  },
  {
    title: '流量',
    colKey: 'traffic',
    width: 220,
    cell: (h, { row }) => {
      return h(
        'div',
        { style: 'display: flex; flex-direction: column; gap: 4px;' },
        [
          h(
            'div',
            { style: 'font-size: 13px; color: #999;' },
            `↑ ${formatTraffic((row as { egress_traffic: number }).egress_traffic)}`,
          ),
          h(
            'div',
            { style: 'font-size: 13px; color: #999;' },
            `↓ ${formatTraffic((row as { ingress_traffic: number }).ingress_traffic)}`,
          ),
        ],
      );
    },
  },
  {
    title: '创建时间',
    colKey: 'created_at',
    width: 180,
    sorter: true,
    cell: (h, { row }) => {
      return h(
        'span',
        { style: 'font-size: 13px; color: #999;' },
        formatDateTime((row as { created_at: string }).created_at),
      );
    },
  },
  {
    title: '操作',
    colKey: 'actions',
    width: 120,
    cell: (h, { row }) => {
      return h('div', { style: 'display: flex; gap: 8px;' }, [
        h(
          't-button',
          {
            size: 'small',
            variant: 'text',
            shape: 'circle',
            onClick: () => openEdit(row as TableRowData),
          },
          { icon: () => h(EditIcon, { style: 'font-size: 16px;' }) },
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
          { icon: () => h(DeleteIcon, { style: 'font-size: 16px;' }) },
        ),
      ]);
    },
  },
]);

const pagination = computed(() => ({
  current: dataStore.nodes.page,
  pageSize: dataStore.nodes.pageSize,
  total: dataStore.nodes.total,
  showSizer: true,
  pageSizeOptions: [10, 20, 50],
}));

function getLevelSeverity(level: number): 'success' | 'primary' | 'warning' | 'default' {
  if (level >= 5) return 'warning';
  if (level >= 3) return 'primary';
  return 'success';
}

function formatTraffic(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

function formatDateTime(date: string): string {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

function confirmDelete(id: number) {
  deleteId.value = id;
  deleteDialog.value = true;
}

function openEdit(row: TableRowData) {
  editData.value = row as RelayNode;
  editDialogRef.value?.open();
}

function openCreate() {
  editData.value = null;
  editDialogRef.value?.open();
}

async function handleDelete() {
  if (!deleteId.value) return;
  try {
    await dataStore.deleteItem('relay_nodes', deleteId.value);
    refreshData();
  } finally {
    deleteDialog.value = false;
    deleteId.value = null;
  }
}

function onPage(page: { current: number; pageSize: number }) {
  dataStore.nodes.page = page.current;
  dataStore.nodes.pageSize = page.pageSize;
  refreshData();
}

function onSort(sorter: { sortBy?: string; descending?: boolean } | Array<{ sortBy?: string; descending?: boolean }>) {
  const normalized = Array.isArray(sorter) ? sorter[0] : sorter;
  if (normalized?.sortBy) {
    dataStore.nodes.sortBy = [
      { key: normalized.sortBy, order: normalized.descending ? 'desc' : 'asc' },
    ];
  }
  refreshData();
}

async function refreshData() {
  await dataStore.fetchPage('relay_nodes', dataStore.nodes);
}

onMounted(() => {
  refreshData();
});
</script>

<template>
  <t-space direction="vertical" size="large" class="page-container">
    <t-space direction="vertical" size="small">
      <t-typography-title level="h1">中继节点</t-typography-title>
      <t-typography-text theme="secondary">管理所有中继转发节点</t-typography-text>
    </t-space>

    <t-card>
      <t-space direction="vertical" size="small" class="table-wrapper">
        <div class="table-actions">
          <t-button theme="primary" @click="openCreate">
            <template #icon>
              <AddIcon />
            </template>
            新建节点
          </t-button>
        </div>
        <t-table
          :columns="columns"
          :data="dataStore.nodes.items"
          :pagination="pagination"
          :loading="dataStore.nodes.loading"
          table-layout="fixed"
          row-key="id"
          @page-change="onPage"
          @sort-change="onSort"
        >
          <template #empty>
            <t-empty description="暂无节点数据" />
          </template>
        </t-table>
      </t-space>
    </t-card>

    <t-dialog v-model:visible="deleteDialog" header="确认删除" width="400px">
      <t-space direction="vertical" align="center" size="large" class="dialog-body">
        <ErrorTriangleIcon size="64" class="dialog-icon" />
        <span class="dialog-text">确定要删除这个节点吗？此操作不可恢复。</span>
      </t-space>
      <template #footer>
        <t-space align="center" class="dialog-footer">
          <t-button @click="deleteDialog = false">取消</t-button>
          <t-button theme="danger" @click="handleDelete">确认删除</t-button>
        </t-space>
      </template>
    </t-dialog>

    <NodesEditDialog ref="editDialogRef" :edit-data="editData" @saved="refreshData" />
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

.dialog-body {
  padding: 12px 0;
}

.dialog-icon {
  color: var(--td-warning-color);
}

.dialog-text {
  color: var(--td-text-color-secondary);
  text-align: center;
}

.dialog-footer {
  justify-content: flex-end;
}
</style>
