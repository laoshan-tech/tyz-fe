<script setup lang="ts">
import type { RelayNode } from '@/types';
import { useDataStore } from '@/stores/data';
import { computed, ref, watch } from 'vue';
import type { FormInstanceFunctions, FormRules } from 'tdesign-vue-next';

const props = defineProps<{
  editData?: RelayNode | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const dataStore = useDataStore();
const visible = ref(false);
const saving = ref(false);
const formRef = ref<FormInstanceFunctions | null>(null);
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

type NodeFormData = {
  name: string;
  address: string;
  display_address: string;
  level: number;
  is_public: boolean;
  traffic_limit: number;
  description: string;
};

const rules: FormRules<NodeFormData> = {
  name: [
    {
      required: true,
      message: '请输入节点名称',
      trigger: 'blur',
    },
  ],
  address: [
    {
      required: true,
      message: '请输入节点地址',
      trigger: 'blur',
    },
  ],
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
  <t-dialog v-model:visible="visible" :header="isEdit ? '编辑节点' : '新建节点'" width="500px">
    <t-form ref="formRef" :data="formData" :rules="rules">
      <t-form-item label="名称" name="name">
        <t-input v-model="formData.name" placeholder="请输入节点名称" />
      </t-form-item>

      <t-form-item label="地址" name="address">
        <t-input v-model="formData.address" placeholder="例如: 192.168.1.1:8080" />
      </t-form-item>

      <t-form-item label="显示地址" name="display_address">
        <t-input v-model="formData.display_address" placeholder="对外显示的地址（可选）" />
      </t-form-item>

      <t-space :size="16">
        <t-form-item label="级别" name="level">
          <t-input-number v-model="formData.level" :min="0" :max="10" />
        </t-form-item>
        <t-form-item label="流量限制" name="traffic_limit">
          <t-input-number v-model="formData.traffic_limit" placeholder="-1 表示无限制" />
        </t-form-item>
      </t-space>

      <t-form-item label="公开节点" name="is_public">
        <t-checkbox v-model="formData.is_public" />
      </t-form-item>

      <t-form-item label="描述" name="description">
        <t-textarea
          v-model="formData.description"
          :autosize="{ minRows: 3, maxRows: 5 }"
          placeholder="节点描述信息（可选）"
        />
      </t-form-item>
    </t-form>

    <template #footer>
      <t-space align="center" justify="flex-end">
        <t-button @click="close">取消</t-button>
        <t-button theme="primary" :loading="saving" @click="save">{{ isEdit ? '保存' : '创建' }}</t-button>
      </t-space>
    </template>
  </t-dialog>
</template>
