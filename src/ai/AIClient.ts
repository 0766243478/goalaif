// ============================================================================
// SIREEN — AI Client
// ============================================================================
// Abstraction over OpenAI-compatible LLM APIs (OpenAI, Anthropic, OpenRouter).
// Used for generating attack hypotheses and Foundry PoCs.

export type AIProvider = 'openai' | 'anthropic' | 'openrouter';

export interface AIClientConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    message: { content: string };
    finish_reason: string;
  }[];
}

const PROVIDER_BASE_URLS: Record<AIProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.2; // Low temp for deterministic PoC generation

export class AIClient {
  private config: AIClientConfig;

  constructor(config: Partial<AIClientConfig> & { apiKey: string }) {
    this.config = {
      provider: config.provider || 'openrouter',
      apiKey: config.apiKey,
      model: config.model || 'openai/o3-mini',
      baseUrl: config.baseUrl,
      maxTokens: config.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    };
  }

  private getBaseUrl(): string {
    return this.config.baseUrl || PROVIDER_BASE_URLS[this.config.provider];
  }

  /**
   * Send a chat completion request to the LLM.
   * Returns the text content of the response.
   */
  async chat(
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const url = `${this.getBaseUrl()}/chat/completions`;

    const body: ChatCompletionRequest = {
      model: this.config.model,
      messages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens!,
      temperature: options?.temperature ?? this.config.temperature!,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.provider === 'anthropic'
        ? { 'x-api-key': this.config.apiKey }
        : { Authorization: `Bearer ${this.config.apiKey}` }),
    };

    if (this.config.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://sireen.dev';
      headers['X-Title'] = 'Sireen';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      throw new Error(`AI API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI API returned empty response');
    }

    return content;
  }

  /**
   * Simple prompt wrapper — sends a system message and user prompt.
   */
  async prompt(
    systemPrompt: string,
    userPrompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    return this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options
    );
  }

  /**
   * Extract JSON from LLM response, handling markdown fences.
   */
  static extractJSON<T>(text: string): T {
    // Remove markdown code fences if present
    const jsonStr = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(jsonStr) as T;
  }

  /**
   * Extract Solidity code from LLM response, handling markdown fences.
   */
  static extractSolidity(text: string): string {
    // Match solidity code blocks
    const solMatch = text.match(/```solidity\n([\s\S]*?)```/);
    if (solMatch) return solMatch[1].trim();

    // Match generic code blocks
    const codeMatch = text.match(/```\n?([\s\S]*?)```/);
    if (codeMatch) return codeMatch[1].trim();

    // Return the whole text if no fences found
    return text.trim();
  }
}
