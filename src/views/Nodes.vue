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
import NodesEditDialog from '@/components/NodesEditDialog.vue';
import { useDataStore } from '@/stores/data';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { h, onMounted, ref, computed } from 'vue';
import {
  Add,
  Create,
  TrashOutline,
  ArrowUp,
  ArrowDown,
  ServerOutline,
  WarningOutline,
} from '@vicons/ionicons5';

const dataStore = useDataStore();
const deleteDialog = ref(false);
const deleteId = ref<number | null>(null);
const editDialogRef = ref<InstanceType<typeof NodesEditDialog> | null>(null);
const editData = ref<any>(null);

const columns = computed<DataTableColumns<any>>(() => [
  { title: 'ID', key: 'id', width: 50, sorter: 'default' },
  { title: '名称', key: 'name', width: 150, sorter: (a, b) => a.name.localeCompare(b.name) },
  {
    title: '地址',
    key: 'address',
    width: 200,
    sorter: 'default',
  },
  {
    title: '级别',
    key: 'level',
    width: 100,
    sorter: 'default',
    render: (row) => {
      const severity = getLevelSeverity(row.level);
      return h(NTag, { type: severity }, { default: () => `Lv.${row.level}` });
    },
  },
  {
    title: '状态',
    key: 'is_public',
    width: 100,
    sorter: 'default',
    render: (row) => {
      return h(
        'div',
        { style: 'display: flex; align-items: center; gap: 8px;' },
        [
          h('span', {
            style: `width: 8px; height: 8px; border-radius: 50%; background: ${row.is_public ? '#22c55e' : '#94a3b8'};`,
          }),
          h('span', { style: 'font-size: 13px;' }, row.is_public ? '公开' : '私有'),
        ],
      );
    },
  },
  {
    title: '流量',
    key: 'traffic',
    width: 200,
    render: (row) => {
      return h(
        'div',
        { style: 'display: flex; flex-direction: column; gap: 4px;' },
        [
          h('div', { style: 'font-size: 13px; color: #999;' }, `↑ ${formatTraffic(row.egress_traffic)}`),
          h('div', { style: 'font-size: 13px; color: #999;' }, `↓ ${formatTraffic(row.ingress_traffic)}`),
        ],
      );
    },
  },
  {
    title: '创建时间',
    key: 'created_at',
    width: 160,
    sorter: 'default',
    render: (row) => {
      return h('span', { style: 'font-size: 13px; color: #999;' }, formatDateTime(row.created_at));
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) => {
      return h('div', { style: 'display: flex; gap: 8px;' }, [
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
  page: dataStore.nodes.page,
  pageSize: dataStore.nodes.pageSize,
  itemCount: dataStore.nodes.total,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
}));

function rowKey(row: any): DataTableRowKey {
  return row.id;
}

function getLevelSeverity(level: number): 'success' | 'info' | 'warning' | 'default' {
  if (level >= 5) return 'warning';
  if (level >= 3) return 'info';
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

function openEdit(row: any) {
  editData.value = row;
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

function onPage(page: number) {
  dataStore.nodes.page = page;
  refreshData();
}

function onSort(sorter: any) {
  if (sorter && sorter.columnKey) {
    dataStore.nodes.sortBy = [
      { key: sorter.columnKey as string, order: sorter.order === 'ascend' ? 'asc' : 'desc' },
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
  <div style="padding: 24px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h1 style="margin: 0; font-size: 24px;">中继节点</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #999;">管理所有中继转发节点</p>
      </div>
      <n-button type="primary" @click="openCreate">
        <template #icon>
          <Add style="font-size: 16px;" />
        </template>
        新建节点
      </n-button>
    </div>

    <n-card>
      <n-data-table :columns="columns" :data="dataStore.nodes.items" :pagination="pagination" :row-key="rowKey"
        :loading="dataStore.nodes.loading" :striped="true" @update:page="onPage" @update:sorter="onSort">
        <template #empty>
          <div style="text-align: center; padding: 60px 0; color: #999;">
            <ServerOutline style="font-size: 64px; margin-bottom: 16px;" />
            <div style="font-size: 14px;">暂无节点数据</div>
          </div>
        </template>
      </n-data-table>
    </n-card>

    <n-modal v-model:show="deleteDialog" preset="card" :style="{ width: '400px' }">
      <template #header>
        确认删除
      </template>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0;">
        <WarningOutline style="font-size: 80px; color: #eab308;" />
        <p style="margin: 0; text-align: center; color: #666;">确定要删除这个节点吗？此操作不可恢复。</p>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="deleteDialog = false">取消</n-button>
          <n-button type="error" @click="handleDelete">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <NodesEditDialog ref="editDialogRef" :edit-data="editData" @saved="refreshData" />
  </div>
</template>
