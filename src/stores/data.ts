import { supabase } from '@/lib/supabase';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface SortItem {
  key: string;
  order: 'asc' | 'desc';
}

export interface PaginationState {
  items: any[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  sortBy: SortItem[];
}

type TableName = 'relay_nodes' | 'tunnels' | 'relay_rules' | 'chains';

export const useDataStore = defineStore('data', () => {
  const nodes = ref<PaginationState>({
    items: [],
    loading: false,
    page: 1,
    pageSize: 20,
    total: 0,
    sortBy: [{ key: 'created_at', order: 'desc' }],
  });

  const tunnels = ref<PaginationState>({
    items: [],
    loading: false,
    page: 1,
    pageSize: 20,
    total: 0,
    sortBy: [{ key: 'created_at', order: 'desc' }],
  });

  const rules = ref<PaginationState>({
    items: [],
    loading: false,
    page: 1,
    pageSize: 20,
    total: 0,
    sortBy: [{ key: 'created_at', order: 'desc' }],
  });

  const chains = ref<PaginationState>({
    items: [],
    loading: false,
    page: 1,
    pageSize: 20,
    total: 0,
    sortBy: [{ key: 'created_at', order: 'desc' }],
  });

  async function fetchPage(
    table: TableName,
    state: PaginationState,
    options: {
      page?: number;
      pageSize?: number;
      sortBy?: SortItem[];
    } = {},
  ) {
    const page = options.page ?? state.page;
    const pageSize = options.pageSize ?? state.pageSize;
    const sortBy = options.sortBy ?? state.sortBy;

    state.loading = true;

    try {
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      let query = supabase.from(table).select('*', { count: 'exact' }).range(start, end);

      if (sortBy.length > 0) {
        for (const sort of sortBy) {
          query = query.order(sort.key, {
            ascending: sort.order === 'asc',
          });
        }
      }

      const { data, error, count } = await query;

      if (error) throw error;

      state.items = data || [];
      state.total = count || 0;
      state.page = page;
      state.pageSize = pageSize;
      state.sortBy = sortBy;
    } catch (err) {
      console.error(`Failed to fetch ${table}:`, err);
    } finally {
      state.loading = false;
    }
  }

  async function createItem(table: TableName, data: Record<string, unknown>) {
    try {
      const { data: result, error } = await supabase.from(table).insert(data).select().single();

      if (error) throw error;
      return result;
    } catch (err) {
      console.error(`Failed to create ${table}:`, err);
      throw err;
    }
  }

  async function updateItem(table: TableName, id: number, data: Record<string, unknown>) {
    try {
      const { error, data: result } = await supabase.from(table).update(data).eq('id', id).select();

      if (error) throw error;

      if (!result || result.length === 0) {
        throw new Error('未找到要更新的记录');
      }

      return { id };
    } catch (err) {
      console.error(`Failed to update ${table}:`, err);
      throw err;
    }
  }

  async function deleteItem(table: TableName, id: number) {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error(`Failed to delete ${table}:`, err);
      throw err;
    }
  }

  return {
    nodes,
    tunnels,
    rules,
    chains,
    fetchPage,
    createItem,
    updateItem,
    deleteItem,
  };
});
