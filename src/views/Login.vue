<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import type { FormInstanceFunctions, FormRules } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { user, initialize, signIn } = useAuth();

const formData = ref({
  email: '',
  password: '',
});
const loading = ref(false);
const formRef = ref<FormInstanceFunctions | null>(null);

const canSubmit = computed(() => {
  return (
    formData.value.email &&
    formData.value.password &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)
  );
});

type LoginFormData = {
  email: string;
  password: string;
};

const rules: FormRules<LoginFormData> = {
  email: [
    {
      required: true,
      message: '请输入邮箱地址',
      trigger: 'blur',
    },
    {
      validator: (value: string) => {
        if (!value) return { result: false, message: '请输入邮箱地址' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { result: false, message: '邮箱格式不正确' };
        }
        return { result: true, message: '' };
      },
      trigger: 'change',
    },
  ],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: 'blur',
    },
  ],
};

async function handleSubmit() {
  if (!canSubmit.value) return;

  loading.value = true;
  const result = await signIn(formData.value.email, formData.value.password);
  loading.value = false;

  if (result.success) {
    router.push('/dashboard');
  } else {
    MessagePlugin.error(result.error || '用户名或密码错误');
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
    <t-card title="登录" class="login-card">
      <t-form ref="formRef" :data="formData" :rules="rules">
        <t-form-item name="email" label="邮箱">
          <t-input
            v-model="formData.email"
            type="text"
            placeholder="请输入邮箱地址"
            @enter="handleSubmit"
          />
        </t-form-item>
        <t-form-item name="password" label="密码">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            @enter="handleSubmit"
          />
        </t-form-item>
        <t-button
          theme="primary"
          size="large"
          block
          :loading="loading"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          登录
        </t-button>
      </t-form>
    </t-card>
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
