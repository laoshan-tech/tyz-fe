<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCollapse,
  NCollapseItem,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NStep,
  NSteps,
  type FormInst,
  type FormRules,
} from 'naive-ui';
import {
  createMultiNodeChains,
  createSingleNodeChain,
  updateMultiNodeChains,
  updateSingleNodeChains,
  type ChainNode,
} from '@/composables/useTunnelChains';
import { supabase } from '@/lib/supabase';
import type { RelayNode, Tunnel } from '@/types';
import { computed, h, ref, watch } from 'vue';
import { Add, TrashOutline } from '@vicons/ionicons5';

const props = defineProps<{
  editData?: Tunnel | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const saving = ref(false);
const loadingNodes = ref(false);
const currentStep = ref(1);
const chainError = ref('');
const validationErrors = ref<Record<string, string>>({});
const visible = ref(false);
const formRef = ref<FormInst | null>(null);

const isEdit = computed(() => !!props.editData);

const defaultForm = {
  name: '',
  description: '',
  ingress_display_address: '',
  mode: 'single' as 'single' | 'multi',
  singleNodeId: null as number | null,
  ingressNodeId: null as number | null,
  chainNodes: [] as ChainNode[],
  egressNodeId: null as number | null,
};

const formData = ref({ ...defaultForm });
const availableNodes = ref<RelayNode[]>([]);

const rules: FormRules = {
  name: {
    required: true,
    message: '请输入隧道名称',
    trigger: 'blur',
  },
};

function renderNodeOption(option: { name: string; address: string }) {
  return h('div', { style: 'display: flex; flex-direction: column; gap: 2px; padding: 4px 0;' }, [
    h('div', { style: 'font-size: 13px; font-weight: 600;' }, option.name),
    h('div', { style: 'font-size: 12px; color: #999;' }, option.address),
  ]);
}

function initializeForm() {
  const editData = props.editData;

  if (editData) {
    formData.value = {
      name: editData.name,
      description: editData.description || '',
      ingress_display_address: editData.ingress_display_address || '',
      mode: 'multi',
      singleNodeId: null,
      ingressNodeId: null,
      chainNodes: [],
      egressNodeId: null,
    };

    if (editData.chains && editData.chains.length > 0) {
      const ingressChain = editData.chains.find((c) => c.chain_type === 'in');
      const egressChain = editData.chains.find((c) => c.chain_type === 'out');

      if (ingressChain && egressChain && ingressChain.node_id === egressChain.node_id) {
        formData.value.mode = 'single';
        formData.value.singleNodeId = ingressChain.node_id;
      }

      if (ingressChain) {
        formData.value.ingressNodeId = ingressChain.node_id;
      }

      const chainChains = editData.chains
        .filter((c) => c.chain_type === 'chain')
        .sort((a, b) => a.index - b.index);
      formData.value.chainNodes = chainChains.map((c) => ({
        nodeId: c.node_id,
        strategy: c.strategy,
        transport: c.transport,
      }));

      if (egressChain) {
        formData.value.egressNodeId = egressChain.node_id;
      }
    }
  } else {
    formData.value = { ...defaultForm, chainNodes: [] };
    currentStep.value = 1;
  }
}

watch(visible, (newVal) => {
  if (newVal) {
    initializeForm();
  } else {
    currentStep.value = 1;
    chainError.value = '';
    validationErrors.value = {};
  }
});

async function loadNodes() {
  loadingNodes.value = true;
  try {
    const { data, error } = await supabase.from('relay_nodes').select('*').order('name');
    if (error) throw error;
    availableNodes.value = data || [];
  } catch (err) {
    console.error('Failed to load nodes:', err);
  } finally {
    loadingNodes.value = false;
  }
}

function open() {
  loadNodes();
  visible.value = true;
}

function close() {
  visible.value = false;
  currentStep.value = 1;
  chainError.value = '';
  validationErrors.value = {};
}

function addChainNode() {
  formData.value.chainNodes.push({
    nodeId: null,
    strategy: 'round',
    transport: 'raw',
  });
}

function removeChainNode(index: number) {
  formData.value.chainNodes.splice(index, 1);
}

function goToStep1() {
  currentStep.value = 1;
}

async function goToStep2() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  currentStep.value = 2;
}

async function save() {
  saving.value = true;
  chainError.value = '';
  validationErrors.value = {};

  try {
    let ingressId: number;
    let egressId: number;

    if (formData.value.mode === 'single') {
      if (!formData.value.singleNodeId) {
        validationErrors.value.singleNodeId = '请选择节点';
        return;
      }
      ingressId = formData.value.singleNodeId;
      egressId = formData.value.singleNodeId;
    } else {
      if (!formData.value.ingressNodeId) {
        validationErrors.value.ingressNodeId = '请选择入口节点';
        return;
      }
      if (!formData.value.egressNodeId) {
        validationErrors.value.egressNodeId = '请选择出口节点';
        return;
      }
      ingressId = formData.value.ingressNodeId;
      egressId = formData.value.egressNodeId;

      const chainNodeIds = formData.value.chainNodes.map((n) => n.nodeId).filter(Boolean) as number[];

      for (const chainId of chainNodeIds) {
        if (chainId === ingressId) {
          chainError.value = '中继节点不能与入口节点重复';
          return;
        }
        if (chainId === egressId) {
          chainError.value = '中继节点不能与出口节点重复';
          return;
        }
      }

      if (new Set(chainNodeIds).size !== chainNodeIds.length) {
        chainError.value = '中继链中不能包含重复的节点';
        return;
      }

      for (let i = 0; i < formData.value.chainNodes.length; i++) {
        if (!formData.value.chainNodes[i]?.nodeId) {
          chainError.value = `第 ${i + 1} 跳中继节点未选择`;
          return;
        }
      }
    }

    let tunnelId: number;

    if (isEdit.value && props.editData) {
      const { error } = await supabase
        .from('tunnels')
        .update({
          name: formData.value.name,
          description: formData.value.description,
          ingress_display_address: formData.value.ingress_display_address,
        })
        .eq('id', props.editData.id);

      if (error) throw error;
      tunnelId = props.editData.id;
    } else {
      const { data: tunnel, error } = await supabase
        .from('tunnels')
        .insert({
          name: formData.value.name,
          description: formData.value.description,
          ingress_display_address: formData.value.ingress_display_address,
        })
        .select()
        .single();

      if (error) throw error;
      if (!tunnel) throw new Error('创建隧道失败');
      tunnelId = tunnel.id;
    }

    if (isEdit.value && props.editData) {
      if (formData.value.mode === 'single') {
        await updateSingleNodeChains(tunnelId, ingressId, props.editData.chains || []);
      } else {
        await updateMultiNodeChains(tunnelId, ingressId, egressId, formData.value.chainNodes, props.editData.chains || []);
      }
    } else {
      if (formData.value.mode === 'single') {
        await createSingleNodeChain(tunnelId, ingressId);
      } else {
        await createMultiNodeChains(tunnelId, ingressId, egressId, formData.value.chainNodes);
      }
    }

    emit('saved');
    close();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '保存失败';
    console.error('Failed to save tunnel:', err);
    chainError.value = message;

    if (!isEdit.value) {
      const { data: latestTunnel } = await supabase
        .from('tunnels')
        .select('id')
        .eq('name', formData.value.name)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestTunnel) {
        await supabase.from('tunnels').delete().eq('id', latestTunnel.id);
      }
    }
  } finally {
    saving.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <n-modal v-model:show="visible" :style="{ width: '700px' }" preset="card">
    <template #header>
      {{ isEdit ? '编辑隧道' : '新建隧道' }}
    </template>

    <n-steps :current="currentStep" style="margin-bottom: 24px;">
      <n-step title="基本信息" />
      <n-step title="链路配置" />
    </n-steps>

    <!-- Step 1: Basic Info -->
    <div v-show="currentStep === 1">
      <n-form ref="formRef" :model="formData" :rules="rules">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入隧道名称" />
        </n-form-item>

        <n-form-item label="描述" path="description">
          <n-input v-model:value="formData.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </n-form-item>

        <n-form-item label="入口显示地址" path="ingress_display_address">
          <n-input v-model:value="formData.ingress_display_address" placeholder="例如: 1.2.3.4:8080" />
        </n-form-item>

        <n-form-item label="节点模式" path="mode">
          <n-radio-group v-model:value="formData.mode" name="mode">
            <n-space vertical :size="12">
              <n-radio value="single">单节点（入口和出口相同）</n-radio>
              <n-radio value="multi">多节点（可配置中继链）</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
      </n-form>

      <div style="display: flex; justify-content: flex-end;">
        <n-button type="primary" @click="goToStep2">下一步</n-button>
      </div>
    </div>

    <!-- Step 2: Chain Config -->
    <div v-show="currentStep === 2">
      <div v-if="loadingNodes" style="display: flex; flex-direction: column; align-items: center; padding: 32px 0;">
        <n-spin size="large" />
        <p style="margin: 16px 0 0; font-size: 13px; color: #999;">加载节点...</p>
      </div>

      <template v-else>
        <!-- Single Node Mode -->
        <template v-if="formData.mode === 'single'">
          <n-form-item label="选择节点">
            <n-select
              v-model:value="formData.singleNodeId"
              :options="availableNodes"
              label-field="name"
              value-field="id"
              placeholder="选择节点（同时作为入口和出口）"
              :status="validationErrors.singleNodeId ? 'error' : undefined"
              :render-label="renderNodeOption"
            />
          </n-form-item>
          <n-alert v-if="validationErrors.singleNodeId" type="error" :show-icon="false" style="margin-bottom: 12px;">
            {{ validationErrors.singleNodeId }}
          </n-alert>
          <n-alert type="info" style="margin-bottom: 16px;">
            单节点模式：流量直接从入口转发到出口，适用于在同一节点上建立隧道
          </n-alert>
        </template>

        <!-- Multi Node Mode -->
        <template v-else>
          <n-form-item label="入口节点">
            <n-select
              v-model:value="formData.ingressNodeId"
              :options="availableNodes"
              label-field="name"
              value-field="id"
              placeholder="选择入口节点"
              :status="validationErrors.ingressNodeId ? 'error' : undefined"
              :render-label="renderNodeOption"
            />
          </n-form-item>
          <n-alert
            v-if="validationErrors.ingressNodeId"
            type="error"
            :show-icon="false"
            style="margin-bottom: 12px;"
          >
            {{ validationErrors.ingressNodeId }}
          </n-alert>

          <!-- Chain Nodes -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: 500;">中继链配置</span>
            <n-button quaternary size="small" @click="addChainNode">
              <template #icon>
                <Add style="font-size: 14px;" />
              </template>
              添加中继跳
            </n-button>
          </div>

          <n-collapse v-if="formData.chainNodes.length > 0" style="margin-bottom: 16px;">
            <n-collapse-item v-for="(node, index) in formData.chainNodes" :key="index" :name="String(index)">
              <template #header>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 500;">第 {{ index + 1 }} 跳</span>
                  <n-button quaternary type="error" size="small" @click.stop="removeChainNode(index)">
                    <template #icon>
                      <TrashOutline style="font-size: 14px;" />
                    </template>
                  </n-button>
                </div>
              </template>
              <div style="padding: 16px; border-radius: 8px; background: rgba(148, 163, 184, 0.08);">
                <n-form-item label="选择节点">
                  <n-select
                    v-model:value="node.nodeId"
                    :options="availableNodes"
                    label-field="name"
                    value-field="id"
                    placeholder="选择节点"
                    :render-label="renderNodeOption"
                  />
                </n-form-item>
                <n-space :size="12">
                  <n-form-item label="负载策略">
                    <n-select
                      v-model:value="node.strategy"
                      :options="[
                        { label: 'round', value: 'round' },
                        { label: 'random', value: 'random' },
                        { label: 'fifo', value: 'fifo' },
                        { label: 'least', value: 'least' },
                      ]"
                      placeholder="选择策略"
                      style="min-width: 140px;"
                    />
                  </n-form-item>
                  <n-form-item label="传输协议">
                    <n-select
                      v-model:value="node.transport"
                      :options="[
                        { label: 'raw', value: 'raw' },
                        { label: 'ws', value: 'ws' },
                        { label: 'tls', value: 'tls' },
                        { label: 'grpc', value: 'grpc' },
                        { label: 'wss', value: 'wss' },
                        { label: 'mtls', value: 'mtls' },
                        { label: 'mwss', value: 'mwss' },
                      ]"
                      placeholder="选择协议"
                      style="min-width: 140px;"
                    />
                  </n-form-item>
                </n-space>
              </div>
            </n-collapse-item>
          </n-collapse>

          <n-alert v-else type="info" style="margin-bottom: 16px;">
            未配置中继链，流量将直接从入口转发到出口
          </n-alert>

          <!-- Egress Node -->
          <n-form-item label="出口节点">
            <n-select
              v-model:value="formData.egressNodeId"
              :options="availableNodes"
              label-field="name"
              value-field="id"
              placeholder="选择出口节点"
              :status="validationErrors.egressNodeId ? 'error' : undefined"
              :render-label="renderNodeOption"
            />
          </n-form-item>
          <n-alert
            v-if="validationErrors.egressNodeId"
            type="error"
            :show-icon="false"
            style="margin-bottom: 12px;"
          >
            {{ validationErrors.egressNodeId }}
          </n-alert>
        </template>

        <n-alert v-if="chainError" type="error" style="margin-bottom: 16px;">
          {{ chainError }}
        </n-alert>
      </template>

      <div style="display: flex; justify-content: space-between; margin-top: 16px;">
        <n-button quaternary @click="goToStep1">上一步</n-button>
        <n-button type="primary" :loading="saving" :disabled="loadingNodes" @click="save">
          {{ isEdit ? '保存' : '创建' }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>
