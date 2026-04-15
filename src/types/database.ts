export interface Agent {
  id: string;
  user_id: string;
  name: string;
  config: Record<string, any>;
  githubRepo: string | null;
  image_url: string | null;
  status: 'draft' | 'ready' | 'building' | 'deployed' | 'running' | 'stopped' | 'succeeded' | 'failed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Deployment {
  agentId: string;
  name: string;
  version: string;
  dockerImage: string;
  deploymentName: string;
  namespace: string;
  k8sStatus: string;
  replicas: number;
  readyReplicas: number;
  updatedAt: string;
}

export interface GitHubConnection {
  id: string;
  user_id: string;
  github_token: string;
  github_username: string;
  connected_at: string;
}

export interface Span {
  id: string;
  span_id: string;
  parent_id: string | null;
  name: string;
  span_kind: string;
  status_code: string;
  start_time: string;
  end_time: string;
  attributes?: Record<string, any>;
}

export interface Trace {
  id: string;
  trace_id: string;
  project_id: string;
  start_time: string;
  end_time: string;
  spans: Span[];
}

export interface Approval {
  id: string;
  agentId: string;
  agentName?: string;
  method: string;
  targetUrl: string;
  headers?: Record<string, string>;
  body?: string;
  sensitiveReason?: string;
  status: 'pending' | 'approved' | 'denied';
  decision?: 'approved' | 'denied';
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt?: string;
}
