import { getReasoningEffort, MODELS, type ThinkingBudget } from './client';

export interface WebSearchResult {
  title: string;
  url: string;
  pageAge?: string | null;
}

export interface StreamCallbacks {
  onText?: (text: string) => void;
  onThinking?: (text: string) => void;
  onToolUse?: (name: string, input: Record<string, unknown>) => void;
  onWebSearch?: (query: string) => void;
  onWebSearchResults?: (results: WebSearchResult[]) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface StreamOptions {
  apiKey?: string;
  model?: string;
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  thinkingBudget?: ThinkingBudget;
  tools?: Array<Record<string, unknown>>;
  maxTokens?: number;
}

export async function streamMessage(
  options: StreamOptions,
  callbacks: StreamCallbacks
): Promise<string> {
  const {
    apiKey,
    model = MODELS.sonnet,
    system,
    messages,
    thinkingBudget,
    tools,
    maxTokens = 16000,
  } = options;

  let fullText = '';

  try {
    const endpoint = getOpenAiEndpoint();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (!isUsingProxyEndpoint(endpoint)) {
      if (!apiKey) {
        throw new Error('OpenAI API key is required when proxy mode is disabled');
      }
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const payload: Record<string, unknown> = {
      model,
      max_output_tokens: maxTokens,
      input: messages.map((m) => ({
        role: m.role,
        content: [{ type: 'input_text', text: m.content }],
      })),
      stream: true,
    };

    if (system) {
      payload.instructions = system;
    }

    if (thinkingBudget) {
      payload.reasoning = { effort: getReasoningEffort(thinkingBudget) };
    }

    if (tools && tools.length > 0) {
      payload.tools = normalizeTools(tools);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await extractApiError(response));
    }

    if (!response.body) {
      throw new Error('OpenAI response stream was empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const evt = JSON.parse(data) as Record<string, unknown>;
          const type = typeof evt.type === 'string' ? evt.type : '';

          if (type === 'response.output_text.delta') {
            const delta = typeof evt.delta === 'string' ? evt.delta : '';
            if (delta) {
              fullText += delta;
              callbacks.onText?.(delta);
            }
            continue;
          }

          if (type.includes('reasoning')) {
            const delta = typeof evt.delta === 'string' ? evt.delta : '';
            if (delta) callbacks.onThinking?.(delta);
            continue;
          }

          if (type.includes('web_search')) {
            const query = extractQuery(evt);
            if (query) callbacks.onWebSearch?.(query);

            const results = extractWebResults(evt);
            if (results.length > 0) callbacks.onWebSearchResults?.(results);
            callbacks.onToolUse?.('web_search', {});
          }
        } catch {
          // Ignore malformed SSE chunks and continue streaming.
        }
      }
    }

    callbacks.onDone?.(fullText);
    return fullText;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError?.(err);
    throw err;
  }
}

export async function streamWithRetry(
  options: StreamOptions,
  callbacks: StreamCallbacks,
  maxRetries = 3,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await streamMessage(options, callbacks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate');
      if (isRateLimit && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

// Non-streaming version for simpler calls
export async function sendMessage(
  options: Omit<StreamOptions, 'maxTokens'> & { maxTokens?: number },
): Promise<{ outputText: string }> {
  const {
    apiKey,
    model = MODELS.sonnet,
    system,
    messages,
    thinkingBudget,
    tools,
    maxTokens = 16000,
  } = options;

  const payload: Record<string, unknown> = {
    model,
    max_output_tokens: maxTokens,
    input: messages.map((m) => ({
      role: m.role,
      content: [{ type: 'input_text', text: m.content }],
    })),
  };

  if (system) {
    payload.instructions = system;
  }

  if (thinkingBudget) {
    payload.reasoning = { effort: getReasoningEffort(thinkingBudget) };
  }

  if (tools && tools.length > 0) {
    payload.tools = normalizeTools(tools);
  }

  const endpoint = getOpenAiEndpoint();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!isUsingProxyEndpoint(endpoint)) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required when proxy mode is disabled');
    }
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractApiError(response));
  }

  const data = await response.json() as Record<string, unknown>;
  return { outputText: extractOutputText(data) };
}

function normalizeTools(tools: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return tools.map((tool) => {
    const type = typeof tool.type === 'string' ? tool.type : '';
    if (type === 'web_search_20250305' || type === 'web_search' || type === 'web_search_preview') {
      return { type: 'web_search_preview' };
    }
    return tool;
  });
}

function extractOutputText(data: Record<string, unknown>): string {
  const direct = data.output_text;
  if (typeof direct === 'string' && direct.length > 0) return direct;

  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string') chunks.push(text);
    }
  }
  return chunks.join('');
}

async function extractApiError(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: { message?: string } };
    if (data?.error?.message) return data.error.message;
  } catch {
    // ignore
  }
  return `OpenAI API error (${response.status})`;
}

function extractQuery(evt: Record<string, unknown>): string | null {
  if (typeof evt.query === 'string') return evt.query;
  if (typeof evt.search_query === 'string') return evt.search_query;
  if (evt.arguments && typeof evt.arguments === 'object') {
    const args = evt.arguments as Record<string, unknown>;
    if (typeof args.query === 'string') return args.query;
  }
  return null;
}

function extractWebResults(evt: Record<string, unknown>): WebSearchResult[] {
  const raw = Array.isArray(evt.results) ? evt.results : [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      title: typeof r.title === 'string' ? r.title : '',
      url: typeof r.url === 'string' ? r.url : '',
      pageAge: typeof r.page_age === 'string' ? r.page_age : null,
    }))
    .filter((r) => !!r.url);
}

function getOpenAiEndpoint(): string {
  const env = (import.meta as { env?: Record<string, string> }).env;
  const explicit = env?.VITE_OPENAI_PROXY_URL?.trim();
  if (explicit) return explicit;

  const proxyMode = env?.VITE_USE_OPENAI_PROXY;
  if (proxyMode === 'true') return '/api/openai/responses';
  return 'https://api.openai.com/v1/responses';
}

function isUsingProxyEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/');
}
