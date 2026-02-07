import { supabase } from '@/lib/supabase';
import type { Chain } from '@/types';

export interface ChainNode {
  nodeId: number | null;
  strategy: string;
  transport: string;
}

export interface PortCheckResult {
  available: boolean;
  port?: number;
  error?: string;
}

export function parsePortRange(portsStr: string): number[] {
  const ports: number[] = [];
  const parts = portsStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const segments = trimmed.split('-').map(Number);
      const start = segments[0] ?? 0;
      const end = segments[1] ?? start;
      for (let i = start; i <= end; i++) {
        ports.push(i);
      }
    } else {
      ports.push(Number(trimmed));
    }
  }

  return [...new Set(ports)].sort((a, b) => a - b);
}

export async function checkPortAvailable(
  nodeId: number,
  excludeChainIds?: number[],
): Promise<PortCheckResult> {
  try {
    const { data: node, error: nodeError } = await supabase
      .from('relay_nodes')
      .select('ports, name')
      .eq('id', nodeId)
      .single();

    if (nodeError || !node) {
      return { available: false, error: '节点不存在' };
    }

    const availablePorts = parsePortRange(node.ports);
    if (availablePorts.length === 0) {
      return { available: false, error: `节点 ${node.name} 没有可用端口配置` };
    }

    let query = supabase.from('chains').select('port').eq('node_id', nodeId).not('port', 'is', null);

    if (excludeChainIds && excludeChainIds.length > 0) {
      query = query.not('id', 'in', `(${excludeChainIds.join(',')})`);
    }

    const { data: usedChains, error: usedError } = await query;

    if (usedError) throw usedError;

    const usedPorts = usedChains?.map((c) => c.port) || [];
    const freePort = availablePorts.find((p) => !usedPorts.includes(p));

    if (!freePort) {
      return { available: false, error: `节点 ${node.name} 端口已满（范围: ${node.ports}）` };
    }

    return { available: true, port: freePort };
  } catch (err) {
    console.error('Failed to check port:', err);
    return { available: false, error: '检查端口失败' };
  }
}

export async function createSingleNodeChain(tunnelId: number, nodeId: number): Promise<void> {
  const portCheck = await checkPortAvailable(nodeId);
  if (!portCheck.available || portCheck.port === undefined) {
    throw new Error(portCheck.error || '端口分配失败');
  }

  const chain: Omit<Chain, 'id' | 'created_at' | 'updated_at'> = {
    tunnel_id: tunnelId,
    node_id: nodeId,
    chain_type: 'in',
    index: 0,
    port: portCheck.port,
    strategy: 'round',
    transport: 'raw',
  };

  const { error } = await supabase.from('chains').insert(chain);
  if (error) throw error;
}

export async function createMultiNodeChains(
  tunnelId: number,
  ingressId: number,
  egressId: number,
  chainNodes: ChainNode[],
): Promise<void> {
  const chains: Omit<Chain, 'id' | 'created_at' | 'updated_at'>[] = [];

  chains.push({
    tunnel_id: tunnelId,
    node_id: ingressId,
    chain_type: 'in',
    index: 0,
    port: 0,
    strategy: 'round',
    transport: 'raw',
  });

  for (const [i, nodeConfig] of chainNodes.entries()) {
    if (nodeConfig.nodeId === null) {
      throw new Error(`第 ${i + 1} 跳中继节点未选择`);
    }

    const portCheck = await checkPortAvailable(nodeConfig.nodeId);

    if (!portCheck.available || portCheck.port === undefined) {
      throw new Error(portCheck.error || '端口分配失败');
    }

    chains.push({
      tunnel_id: tunnelId,
      node_id: nodeConfig.nodeId,
      chain_type: 'chain',
      index: i + 1,
      port: portCheck.port,
      strategy: nodeConfig.strategy,
      transport: nodeConfig.transport,
    });
  }

  const egressPortCheck = await checkPortAvailable(egressId);
  if (!egressPortCheck.available || egressPortCheck.port === undefined) {
    throw new Error(egressPortCheck.error || '端口分配失败');
  }

  chains.push({
    tunnel_id: tunnelId,
    node_id: egressId,
    chain_type: 'out',
    index: 0,
    port: egressPortCheck.port,
    strategy: 'round',
    transport: 'raw',
  });

  const { error } = await supabase.from('chains').insert(chains);
  if (error) throw error;
}

export async function updateSingleNodeChains(
  tunnelId: number,
  nodeId: number,
  existingChains: Chain[],
): Promise<void> {
  const existingIngress = existingChains.find((c) => c.chain_type === 'in');
  const existingEgress = existingChains.find((c) => c.chain_type === 'out');
  const existingChainNodes = existingChains.filter((c) => c.chain_type === 'chain');

  // 单节点模式不需要 egress 和 chain 节点，删除它们
  const chainsToDelete: number[] = [];
  if (existingEgress?.id) chainsToDelete.push(existingEgress.id);
  for (const c of existingChainNodes) {
    if (c.id) chainsToDelete.push(c.id);
  }

  if (chainsToDelete.length > 0) {
    const { error } = await supabase.from('chains').delete().in('id', chainsToDelete);
    if (error) throw error;
  }

  // 更新或创建 ingress chain
  if (existingIngress?.id) {
    const portCheck = await checkPortAvailable(nodeId, [existingIngress.id]);
    if (!portCheck.available || portCheck.port === undefined) {
      throw new Error(portCheck.error || '端口分配失败');
    }

    const { error } = await supabase
      .from('chains')
      .update({ node_id: nodeId, port: portCheck.port })
      .eq('id', existingIngress.id);
    if (error) throw error;
  } else {
    // 如果没有 ingress chain，创建一个新的
    await createSingleNodeChain(tunnelId, nodeId);
  }
}

export async function updateMultiNodeChains(
  tunnelId: number,
  ingressId: number,
  egressId: number,
  chainNodes: ChainNode[],
  existingChains: Chain[],
): Promise<void> {
  const existingIngress = existingChains.find((c) => c.chain_type === 'in');
  const existingEgress = existingChains.find((c) => c.chain_type === 'out');
  const existingChainNodes = existingChains
    .filter((c) => c.chain_type === 'chain')
    .sort((a, b) => a.index - b.index);

  const chainsToDelete: number[] = [];
  const newChains: Omit<Chain, 'id' | 'created_at' | 'updated_at'>[] = [];

  if (existingIngress?.id) {
    const { error } = await supabase
      .from('chains')
      .update({ node_id: ingressId, port: 0 })
      .eq('id', existingIngress.id);
    if (error) throw error;
  } else {
    newChains.push({
      tunnel_id: tunnelId,
      node_id: ingressId,
      chain_type: 'in',
      index: 0,
      port: 0,
      strategy: 'round',
      transport: 'raw',
    });
  }

  const newChainCount = chainNodes.length;
  const existingChainCount = existingChainNodes.length;

  for (let i = 0; i < Math.max(newChainCount, existingChainCount); i++) {
    if (i < newChainCount && i < existingChainCount) {
      const nodeConfig = chainNodes[i]!;
      const existingChain = existingChainNodes[i]!;

      if (nodeConfig.nodeId === null) {
        throw new Error(`第 ${i + 1} 跳中继节点未选择`);
      }

      if (existingChain.id === undefined) {
        throw new Error(`第 ${i + 1} 跳中继节点缺少ID`);
      }

      const portCheck = await checkPortAvailable(nodeConfig.nodeId, [existingChain.id]);

      if (!portCheck.available || portCheck.port === undefined) {
        throw new Error(portCheck.error || '端口分配失败');
      }

      const { error } = await supabase
        .from('chains')
        .update({
          node_id: nodeConfig.nodeId,
          index: i + 1,
          port: portCheck.port,
          strategy: nodeConfig.strategy,
          transport: nodeConfig.transport,
        })
        .eq('id', existingChain.id);
      if (error) throw error;
    } else if (i < newChainCount) {
      const nodeConfig = chainNodes[i]!;
      if (nodeConfig.nodeId === null) {
        throw new Error(`第 ${i + 1} 跳中继节点未选择`);
      }

      const portCheck = await checkPortAvailable(nodeConfig.nodeId);

      if (!portCheck.available || portCheck.port === undefined) {
        throw new Error(portCheck.error || '端口分配失败');
      }

      newChains.push({
        tunnel_id: tunnelId,
        node_id: nodeConfig.nodeId,
        chain_type: 'chain',
        index: i + 1,
        port: portCheck.port,
        strategy: nodeConfig.strategy,
        transport: nodeConfig.transport,
      });
    } else {
      const chainId = existingChainNodes[i]?.id;
      if (chainId !== undefined) {
        chainsToDelete.push(chainId);
      }
    }
  }

  if (existingEgress?.id) {
    const portCheck = await checkPortAvailable(egressId, [existingEgress.id]);
    if (!portCheck.available) {
      throw new Error(portCheck.error || '端口分配失败');
    }

    const { error } = await supabase
      .from('chains')
      .update({ node_id: egressId, port: portCheck.port })
      .eq('id', existingEgress.id);
    if (error) throw error;
  } else {
    const portCheck = await checkPortAvailable(egressId);
    if (!portCheck.available || portCheck.port === undefined) {
      throw new Error(portCheck.error || '端口分配失败');
    }

    newChains.push({
      tunnel_id: tunnelId,
      node_id: egressId,
      chain_type: 'out',
      index: 0,
      port: portCheck.port,
      strategy: 'round',
      transport: 'raw',
    });
  }

  if (chainsToDelete.length > 0) {
    const { error } = await supabase.from('chains').delete().in('id', chainsToDelete);
    if (error) throw error;
  }

  if (newChains.length > 0) {
    const { error } = await supabase.from('chains').insert(newChains);
    if (error) throw error;
  }
}
