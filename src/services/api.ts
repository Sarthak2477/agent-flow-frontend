const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://unwholesomely-proanarchy-bud.ngrok-free.dev/api/v1';

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string>),
  };

  if (token && !endpoint.includes('/auth/')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new APIError(response.status, error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  github: {
    getOAuthUrl: () => fetchAPI('/github/oauth-url'),
    exchangeCode: (code: string) =>
      fetchAPI('/github/exchange-code', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    getRepos: async () => {
      const res = await fetchAPI('/github/repos');
      return Array.isArray(res) ? res : res.data || res.repos || [];
    },
  },

  agents: {
    list: async () => {
      const res = await fetchAPI('/agents');
      return Array.isArray(res) ? res : res.data || res.agents || [];
    },
    get: async (id: string) => {
      const res = await fetchAPI(`/agents/${id}`);
      // Normalize: backend may wrap response in { data: {...} } or { agent: {...} }
      return res?.data || res?.agent || res;
    },
    create: (name: string, config?: Record<string, any>) =>
      fetchAPI('/agents', {
        method: 'POST',
        body: JSON.stringify({ name, config }),
      }),
    update: (id: string, data: { name?: string; config?: Record<string, any>; status?: string }) =>
      fetchAPI(`/agents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI(`/agents/${id}`, {
        method: 'DELETE',
      }),
    connectGitHub: (id: string, githubRepo: string) =>
      fetchAPI(`/agents/${id}/github`, {
        method: 'POST',
        body: JSON.stringify({ githubRepo }),
      }),
    getRuns: (id: string) => fetchAPI(`/agents/${id}/runs`),
  },

  deploy: {
    deploy: (id: string, env?: Record<string, any>) =>
      fetchAPI(`/deploy/${id}`, {
        method: 'POST',
        body: JSON.stringify({ env }),
      }),
    run: (id: string, env?: Record<string, any>) =>
      fetchAPI(`/deploy/${id}/run`, {
        method: 'POST',
        body: JSON.stringify({ env }),
      }),
    list: async () => {
      const res = await fetchAPI('/deploy');
      return Array.isArray(res) ? res : res.deployments || res.data || [];
    },
    getStatus: (id: string) => fetchAPI(`/deploy/${id}/status`),
    destroy: (id: string) =>
      fetchAPI(`/deploy/${id}`, {
        method: 'DELETE',
      }),
  },

  observability: {
    getTraces: (agentId: string) => fetchAPI(`/observability/agent/${agentId}/traces`),
    getSpans: (agentId: string) => fetchAPI(`/observability/agent/${agentId}/spans`),
    getExperiments: (agentId: string) => fetchAPI(`/observability/agent/${agentId}/experiments`),
    getProjects: () => fetchAPI('/observability/projects'),
  },

  logs: {
    getAgentLogs: (agentId: string, lines = 200) => fetchAPI(`/logs/agent/${agentId}?lines=${lines}`),
  },

  approvals: {
    listPending: async () => {
      const res = await fetchAPI('/approvals/pending');
      return Array.isArray(res) ? res : res.data || res.approvals || [];
    },
    listAll: async () => {
      const res = await fetchAPI('/approvals');
      return Array.isArray(res) ? res : res.data || res.approvals || [];
    },
    listByAgent: async (agentId: string) => {
      const res = await fetchAPI(`/approvals/agent/${agentId}`);
      return Array.isArray(res) ? res : res.data || res.approvals || [];
    },
    decide: (id: string, decision: 'approved' | 'denied') =>
      fetchAPI(`/approvals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      }),
  },
};

