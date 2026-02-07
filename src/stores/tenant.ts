import { supabase } from '@/lib/supabase';
import type { Tenant } from '@/types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTenantStore = defineStore('tenant', () => {
  const tenants = ref<Tenant[]>([]);
  const currentTenant = ref<Tenant | null>(null);
  const loading = ref(false);

  async function fetchTenants() {
    loading.value = true;
    try {
      const { data, error } = await supabase.from('tenants').select('*').order('name');
      if (error) throw error;
      tenants.value = (data || []) as Tenant[];
      if (tenants.value.length > 0 && !currentTenant.value) {
        currentTenant.value = tenants.value[0] ?? null;
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      loading.value = false;
    }
  }

  function setCurrentTenant(tenant: Tenant | null) {
    currentTenant.value = tenant;
  }

  return {
    tenants,
    currentTenant,
    loading,
    fetchTenants,
    setCurrentTenant,
  };
});
