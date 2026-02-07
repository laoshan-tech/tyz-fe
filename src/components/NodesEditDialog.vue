<script setup lang="ts">
import {
  NButton,
  NCheckbox,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSpace,
  type FormInst,
  type FormRules,
} from 'naive-ui';
import type { RelayNode } from '@/types';
import { useDataStore } from '@/stores/data';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  editData?: RelayNode | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const dataStore = useDataStore();
const visible = ref(false);
const saving = ref(false);
const formRef = ref<FormInst | null>(null);
const isEdit = computed(() => !!props.editData);

const defaultForm = {
  name: '',
  address: '',
  display_address: '',
  level: 0,
  is_public: true,
  traffic_limit: -1,
  description: '',
};
const formData = ref({ ...defaultForm });

const rules: FormRules = {
  name: {
    required: true,
    message: '请输入节点名称',
    trigger: 'blur',
  },
  address: {
    required: true,
    message: '请输入节点地址',
    trigger: 'blur',
  },
};

watch(
  () => props.editData,
  (newData) => {
    if (newData) {
      formData.value = {
        name: newData.name,
        address: newData.address,
        display_address: newData.display_address || '',
        level: newData.level,
        is_public: newData.is_public,
        traffic_limit: newData.traffic_limit,
        description: newData.description || '',
      };
    } else {
      formData.value = { ...defaultForm };
    }
  },
  { immediate: true },
);

function open() {
  visible.value = true;
}

function close() {
  visible.value = false;
}

async function save() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value && props.editData) {
      await dataStore.updateItem('relay_nodes', props.editData.id, formData.value);
    } else {
      await dataStore.createItem('relay_nodes', formData.value);
    }
    emit('saved');
    close();
  } finally {
    saving.value = false;
  }
}

defineExpose({
  open,
});
</script>

<template>
  <n-modal v-model:show="visible" preset="card" :style="{ width: '500px' }">
    <template #header>
      {{ isEdit ? '编辑节点' : '新建节点' }}
    </template>

    <n-form ref="formRef" :model="formData" :rules="rules">
      <n-form-item label="名称" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入节点名称" />
      </n-form-item>

      <n-form-item label="地址" path="address">
        <n-input v-model:value="formData.address" placeholder="例如: 192.168.1.1:8080" />
      </n-form-item>

      <n-form-item label="显示地址" path="display_address">
        <n-input v-model:value="formData.display_address" placeholder="对外显示的地址（可选）" />
      </n-form-item>

      <n-space :size="16">
        <n-form-item label="级别" path="level">
          <n-input-number v-model:value="formData.level" :min="0" :max="10" />
        </n-form-item>
        <n-form-item label="流量限制" path="traffic_limit">
          <n-input-number v-model:value="formData.traffic_limit" placeholder="-1 表示无限制" />
        </n-form-item>
      </n-space>

      <n-form-item label="公开节点" path="is_public">
        <n-checkbox v-model:checked="formData.is_public" />
      </n-form-item>

      <n-form-item label="描述" path="description">
        <n-input
          v-model:value="formData.description"
          type="textarea"
          :rows="3"
          placeholder="节点描述信息（可选）"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="close">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">{{ isEdit ? '保存' : '创建' }}</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
