function getRuntimeDomain(): string {
  return process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_DOMAIN || '';
}

export function getApiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) {
    return configured.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
  }
  const domain = getRuntimeDomain();
  return domain ? `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/api` : '';
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = getApiBase();
  if (!base) throw new Error('The Lead Onto API is not configured for this build.');
  const response = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function askAI(prompt: string, system: string, maxTokens = 500): Promise<string> {
  const data = await apiRequest<{ text?: string; content?: string }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt, system, maxTokens }),
  });
  return data.text || data.content || 'No response received.';
}

export function openApiUrl(path: string): string {
  const base = getApiBase();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export type MobileSession = {
  user: {
    id: number;
    email: string;
    name: string | null;
    credits?: number;
    preferredLanguage?: string | null;
    location?: string | null;
    careerGoal?: string | null;
    skills?: string[];
    isAdmin?: boolean;
  } | null;
};

export async function getSession(): Promise<MobileSession['user']> {
  const data = await apiRequest<MobileSession>('/auth/me');
  return data.user;
}

export async function saveHistory(tool: string, title: string, content: string): Promise<void> {
  await apiRequest('/history/items', {
    method: 'POST',
    body: JSON.stringify({ tool, title, content }),
  });
}

export async function readSSE(path: string, body: Record<string, unknown>): Promise<string> {
  const base = getApiBase();
  if (!base) throw new Error('The Lead Onto API is not configured for this build.');
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  const raw = await response.text();
  const chunks: string[] = [];
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data:')) continue;
    try {
      const event = JSON.parse(line.slice(5).trim()) as { content?: string; error?: string };
      if (event.error) throw new Error(event.error);
      if (event.content) chunks.push(event.content);
    } catch (error) {
      if (error instanceof Error && error.message !== 'Unexpected end of JSON input') throw error;
    }
  }
  return chunks.join('');
}