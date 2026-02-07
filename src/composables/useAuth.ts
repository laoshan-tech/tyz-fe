import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { computed, readonly, ref } from 'vue';

let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;
const user = ref<User | null>(null);
const loading = ref(true);
let isInitialized = false;

const isAuthenticated = computed(() => !!user.value);

async function initialize() {
  if (isInitialized) return;

  isInitialized = true;
  const { data } = await supabase.auth.getUser();
  user.value = data.user;
  loading.value = false;

  if (!authListener) {
    authListener = supabase.auth.onAuthStateChange((_, session) => {
      user.value = session?.user ?? null;
    });
  }
}

async function signIn(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function signOut() {
  await supabase.auth.signOut();
}

export function useAuth() {
  return {
    user: readonly(user),
    loading: readonly(loading),
    isAuthenticated,
    initialize,
    signIn,
    signOut,
  };
}
