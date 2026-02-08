<script setup lang="ts">
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
import { AddIcon, DeleteIcon } from 'tdesign-icons-vue-next';
import type { FormInstanceFunctions, FormRules } from 'tdesign-vue-next';

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
const formRef = ref<FormInstanceFunctions | null>(null);

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

type TunnelFormData = {
  name: string;
  description: string;
  ingress_display_address: string;
  mode: 'single' | 'multi';
  singleNodeId: number | null;
  ingressNodeId: number | null;
  chainNodes: ChainNode[];
  egressNodeId: number | null;
};

const rules: FormRules<TunnelFormData> = {
  name: [
    {
      required: true,
      message: '请输入隧道名称',
      trigger: 'blur',
    },
  ],
};

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

function renderNodeOption(h: any, node: RelayNode) {
  return h('div', { class: 'node-option' }, [
    h('div', { class: 'node-name' }, node.name),
    h('div', { class: 'node-address' }, node.address),
  ]);
}
</script>

<template>
  <t-dialog v-model:visible="visible" :header="isEdit ? '编辑隧道' : '新建隧道'" width="700px">
    <t-steps :current="currentStep" class="steps-wrapper">
      <t-step-item title="基本信息" />
      <t-step-item title="链路配置" />
    </t-steps>

    <!-- Step 1: Basic Info -->
    <div v-show="currentStep === 1">
      <t-form ref="formRef" :data="formData" :rules="rules">
        <t-form-item label="名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入隧道名称" />
        </t-form-item>

        <t-form-item label="描述" name="description">
          <t-textarea v-model="formData.description" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="请输入描述" />
        </t-form-item>

        <t-form-item label="入口显示地址" name="ingress_display_address">
          <t-input v-model="formData.ingress_display_address" placeholder="例如: 1.2.3.4:8080" />
        </t-form-item>

        <t-form-item label="节点模式" name="mode">
          <t-radio-group v-model="formData.mode">
            <t-space direction="vertical" :size="12">
              <t-radio value="single">单节点（入口和出口相同）</t-radio>
              <t-radio value="multi">多节点（可配置中继链）</t-radio>
            </t-space>
          </t-radio-group>
        </t-form-item>
      </t-form>

      <t-space class="step-actions" justify="flex-end">
        <t-button theme="primary" @click="goToStep2">下一步</t-button>
      </t-space>
    </div>

    <!-- Step 2: Chain Config -->
    <div v-show="currentStep === 2">
      <div v-if="loadingNodes" class="loading-wrapper">
        <t-loading size="large" />
        <p class="loading-text">加载节点...</p>
      </div>

      <template v-else>
        <!-- Single Node Mode -->
        <template v-if="formData.mode === 'single'">
          <t-form-item label="选择节点">
            <t-select
              v-model="formData.singleNodeId"
              :options="availableNodes"
              label-key="name"
              value-key="id"
              placeholder="选择节点（同时作为入口和出口）"
              :status="validationErrors.singleNodeId ? 'error' : undefined"
              :value="formData.singleNodeId"
            >
              <t-option v-for="node in availableNodes" :key="node.id" :value="node.id" :label="node.name">
                <component :is="() => renderNodeOption(h, node)" />
              </t-option>
            </t-select>
          </t-form-item>
          <t-alert v-if="validationErrors.singleNodeId" theme="error" class="validation-alert">
            {{ validationErrors.singleNodeId }}
          </t-alert>
          <t-alert theme="info" class="info-alert">
            单节点模式：流量直接从入口转发到出口，适用于在同一节点上建立隧道
          </t-alert>
        </template>

        <!-- Multi Node Mode -->
        <template v-else>
          <t-form-item label="入口节点">
            <t-select
              v-model="formData.ingressNodeId"
              :options="availableNodes"
              label-key="name"
              value-key="id"
              placeholder="选择入口节点"
              :status="validationErrors.ingressNodeId ? 'error' : undefined"
              :value="formData.ingressNodeId"
            >
              <t-option v-for="node in availableNodes" :key="node.id" :value="node.id" :label="node.name">
                <component :is="() => renderNodeOption(h, node)" />
              </t-option>
            </t-select>
          </t-form-item>
          <t-alert v-if="validationErrors.ingressNodeId" theme="error" class="validation-alert">
            {{ validationErrors.ingressNodeId }}
          </t-alert>

          <!-- Chain Nodes -->
          <div class="chain-header">
            <span class="chain-title">中继链配置</span>
            <t-button variant="text" size="small" @click="addChainNode">
              <template #icon>
                <AddIcon />
              </template>
              添加中继跳
            </t-button>
          </div>

          <t-collapse v-if="formData.chainNodes.length > 0" class="chain-collapse">
            <t-collapse-panel v-for="(node, index) in formData.chainNodes" :key="index" :value="String(index)">
              <template #header>
                <div class="chain-panel-header">
                  <span class="chain-panel-title">第 {{ index + 1 }} 跳</span>
                  <t-button variant="text" theme="danger" size="small" @click.stop="removeChainNode(index)">
                    <template #icon>
                      <DeleteIcon />
                    </template>
                  </t-button>
                </div>
              </template>
              <div class="chain-panel-content">
                <t-form-item label="选择节点">
                  <t-select
                    v-model="node.nodeId"
                    :options="availableNodes"
                    label-key="name"
                    value-key="id"
                    placeholder="选择节点"
                    :value="node.nodeId"
                  >
                    <t-option v-for="option in availableNodes" :key="option.id" :value="option.id" :label="option.name">
                      <component :is="() => renderNodeOption(h, option)" />
                    </t-option>
                  </t-select>
                </t-form-item>
                <t-space :size="12">
                  <t-form-item label="负载策略">
                    <t-select
                      v-model="node.strategy"
                      :options="[
                        { label: 'round', value: 'round' },
                        { label: 'random', value: 'random' },
                        { label: 'fifo', value: 'fifo' },
                        { label: 'least', value: 'least' },
                      ]"
                      placeholder="选择策略"
                      class="strategy-select"
                    />
                  </t-form-item>
                  <t-form-item label="传输协议">
                    <t-select
                      v-model="node.transport"
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
                      class="transport-select"
                    />
                  </t-form-item>
                </t-space>
              </div>
            </t-collapse-panel>
          </t-collapse>

          <t-alert v-else theme="info" class="info-alert">
            未配置中继链，流量将直接从入口转发到出口
          </t-alert>

          <!-- Egress Node -->
          <t-form-item label="出口节点">
            <t-select
              v-model="formData.egressNodeId"
              :options="availableNodes"
              label-key="name"
              value-key="id"
              placeholder="选择出口节点"
              :status="validationErrors.egressNodeId ? 'error' : undefined"
              :value="formData.egressNodeId"
            >
              <t-option v-for="node in availableNodes" :key="node.id" :value="node.id" :label="node.name">
                <component :is="() => renderNodeOption(h, node)" />
              </t-option>
            </t-select>
          </t-form-item>
          <t-alert v-if="validationErrors.egressNodeId" theme="error" class="validation-alert">
            {{ validationErrors.egressNodeId }}
          </t-alert>
        </template>

        <t-alert v-if="chainError" theme="error" class="error-alert">
          {{ chainError }}
        </t-alert>
      </template>

      <t-space class="step-actions" justify="space-between">
        <t-button variant="text" @click="goToStep1">上一步</t-button>
        <t-button theme="primary" :loading="saving" :disabled="loadingNodes" @click="save">
          {{ isEdit ? '保存' : '创建' }}
        </t-button>
      </t-space>
    </div>
  </t-dialog>
</template>

<style scoped>
.steps-wrapper {
  margin-bottom: 24px;
}

.step-actions {
  margin-top: 16px;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
}

.loading-text {
  margin: 16px 0 0;
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.validation-alert {
  margin-bottom: 12px;
}

.info-alert {
  margin-bottom: 16px;
}

.error-alert {
  margin-bottom: 16px;
}

.chain-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chain-title {
  font-weight: 500;
}

.chain-collapse {
  margin-bottom: 16px;
}

.chain-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chain-panel-title {
  font-weight: 500;
}

.chain-panel-content {
  padding: 16px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.08);
}

.strategy-select,
.transport-select {
  min-width: 140px;
}

.node-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}

.node-name {
  font-size: 13px;
  font-weight: 600;
}

.node-address {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
</style>
