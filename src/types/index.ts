export interface Announcement {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
}

export interface RelayNode {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  address: string;
  display_address: string | null;
  token: string;
  level: number;
  is_public: boolean;
  version: string | null;
  egress_traffic: number;
  ingress_traffic: number;
  traffic_limit: number;
  enlarge_scale: number;
  ports: string;
  custom_cfg: Record<string, unknown>;
  user_id: string;
  shadow_user_id: string | null;
}

export interface Tunnel {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  ingress_display_address: string | null;
  user_id: string;
  chains?: Chain[];
}

export interface RelayRule {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  listen_port: number;
  tunnel_id: number | null;
  targets: string;
  limit: Record<string, unknown> | null;
  upload_traffic: number;
  download_traffic: number;
  user_id: string | null;
}

export interface Chain {
  id?: number;
  created_at?: string;
  updated_at?: string;
  tunnel_id?: number;
  node_id: number;
  chain_type: 'in' | 'chain' | 'out';
  index: number;
  port: number;
  strategy: string;
  transport: string;
  node?: RelayNode;
}

export interface Setting {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  value: string;
  user_id: string;
}

export interface Tenant {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  code: string;
  owner: string;
}

export interface VForm {
  validate: () => Promise<boolean>;
  reset: () => void;
  resetValidation: () => void;
}
