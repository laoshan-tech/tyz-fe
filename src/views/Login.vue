<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const message = useMessage();
const { user, initialize, signIn } = useAuth();

const formData = ref({
  email: '',
  password: '',
});
const loading = ref(false);
const formRef = ref<InstanceType<typeof NForm> | null>(null);

const canSubmit = computed(() => {
  return (
    formData.value.email &&
    formData.value.password &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)
  );
});

const rules = {
  email: {
    required: true,
    message: '请输入邮箱地址',
    trigger: ['blur', 'input'],
    validator: (_rule: unknown, value: string) => {
      if (!value) return new Error('请输入邮箱地址');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return new Error('邮箱格式不正确');
      }
      return true;
    },
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['blur', 'input'],
  },
};

async function handleSubmit() {
  if (!canSubmit.value) return;

  loading.value = true;
  const result = await signIn(formData.value.email, formData.value.password);
  loading.value = false;

  if (result.success) {
    router.push('/dashboard');
  } else {
    message.error(result.error || '用户名或密码错误');
  }
}

watch(
  user,
  (currentUser) => {
    if (currentUser) router.push('/dashboard');
  },
  { immediate: true },
);

onMounted(() => {
  initialize();
});
</script>

<template>
  <div class="login-page">
    <n-card title="登录" class="login-card">
      <n-form ref="formRef" :model="formData" :rules="rules">
        <n-form-item path="email" label="邮箱">
          <n-input
            v-model:value="formData.email"
            type="text"
            placeholder="请输入邮箱地址"
            @keyup.enter="handleSubmit"
          />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input
            v-model:value="formData.password"
            type="password"
            placeholder="请输入密码"
            @keyup.enter="handleSubmit"
          />
        </n-form-item>
        <n-button
          type="primary"
          size="large"
          block
          :loading="loading"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          登录
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.login-card {
  width: 100%;
  max-width: 420px;
  margin: 0 20px;
}
</style>
