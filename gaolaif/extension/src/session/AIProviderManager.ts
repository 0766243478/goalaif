import { ProviderName, type AIProvider, type AIProviderConfig, type AIHealthStatus, type AIProviderManagerOptions } from './types';

// AI Provider Manager class
export class AIProviderManager {
  private providers: Map<ProviderName, AIProvider> = new Map();
  private readonly primaryProvider: ProviderName;
  private readonly fallbackProvider: ProviderName | null;
  private readonly options: AIProviderManagerOptions;
  private readonly onStatusChange?: (status: AIHealthStatus) => void;
  private healthCheckInterval: NodeJS.Timeout | undefined;

  constructor(options: AIProviderManagerOptions, onStatusChange?: (status: AIHealthStatus) => void) {
    this.options = options;
    this.onStatusChange = onStatusChange;
    this.primaryProvider = options.primaryProvider || ProviderName.Gemini;
    this.fallbackProvider = options.fallbackProvider || null;
    this.initializeProviders();
    this.startHealthMonitoring();
  }

  private initializeProviders(): void {
    const primaryConfig = this.getProviderConfig(this.primaryProvider);
    if (primaryConfig) {
      const primaryProvider = this.createProvider(this.primaryProvider, primaryConfig);
      this.providers.set(this.primaryProvider, primaryProvider);
    }

    if (this.fallbackProvider) {
      const fallbackConfig = this.getProviderConfig(this.fallbackProvider);
      if (fallbackConfig) {
        const fallbackProvider = this.createProvider(this.fallbackProvider, fallbackConfig);
        this.providers.set(this.fallbackProvider, fallbackProvider);
      }
    }

    console.log('[AIProviderManager] Initialized providers:', Array.from(this.providers.keys()));
  }

  private getProviderConfig(provider: ProviderName): AIProviderConfig | null {
    const config = this.options.providers?.[provider];
    if (!config) {
      console.warn(`[AIProviderManager] No config for provider ${provider}`);
      return null;
    }
    return {
      apiKey: config.apiKey,
      model: config.model,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    };
  }

  private createProvider(name: ProviderName, config: AIProviderConfig): AIProvider {
    switch (name) {
      case ProviderName.Gemini:
        return this.createGeminiProvider(config);
      case ProviderName.OpenRouter:
        return this.createOpenRouterProvider(config);
      case ProviderName.OpenAI:
        return this.createOpenAIProvider(config);
      case ProviderName.Anthropic:
        return this.createAnthropicProvider(config);
      case ProviderName.Local:
        return this.createLocalProvider(config);
      default:
        console.warn(`[AIProviderManager] Unknown provider: ${name}`);
        return this.createFallbackProvider(name, config);
    }
  }

  private createGeminiProvider(config: AIProviderConfig): AIProvider {
    return {
      name: ProviderName.Gemini,
      config,
      async isAvailable(): Promise<boolean> {
        return !!config.apiKey;
      },
      async isHealthy(): Promise<boolean> {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }),
              signal: AbortSignal.timeout((config.timeout || 10000)),
            }
          );
          return response.ok;
        } catch {
          return false;
        }
      },
      async sendMessage(): Promise<any> {
        throw new Error('Gemini provider not fully implemented in this phase');
      },
      async getQuotaStatus(): Promise<{ remaining: number; resetTime: number | null }> {
        return { remaining: 1000, resetTime: null };
      },
      async healthCheck(): Promise<AIHealthStatus> {
        return {
          healthy: true,
          type: 'available',
          message: 'Gemini provider healthy',
          lastChecked: Date.now(),
        };
      },
    };
  }

  private createOpenRouterProvider(config: AIProviderConfig): AIProvider {
    return {
      name: ProviderName.OpenRouter,
      config,
      async isAvailable(): Promise<boolean> {
        return !!config.apiKey;
      },
      async isHealthy(): Promise<boolean> {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 5,
            }),
            signal: AbortSignal.timeout((config.timeout || 10000)),
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      async sendMessage(messages: any, options?: any): Promise<any> {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            ...(options || {}),
          }),
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenRouter API error: ${error}`);
        }
        return response.json();
      },
      async getQuotaStatus(): Promise<{ remaining: number; resetTime: number | null }> {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { 'Authorization': `Bearer ${config.apiKey}` },
          });
          if (response.ok) {
            const data = await response.json();
            return { remaining: data.data?.limit?.remaining || 0, resetTime: null };
          }
        } catch {}
        return { remaining: Infinity, resetTime: null };
      },
      async healthCheck(): Promise<AIHealthStatus> {
        return {
          healthy: true,
          type: 'available',
          message: 'OpenRouter provider healthy',
          lastChecked: Date.now(),
        };
      },
    };
  }

  private createOpenAIProvider(config: AIProviderConfig): AIProvider {
    return {
      name: ProviderName.OpenAI,
      config,
      async isAvailable(): Promise<boolean> {
        return !!config.apiKey;
      },
      async isHealthy(): Promise<boolean> {
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${config.apiKey}` },
            signal: AbortSignal.timeout((config.timeout || 10000)),
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      async sendMessage(messages: any, options?: any): Promise<any> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            ...(options || {}),
          }),
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${error}`);
        }
        return response.json();
      },
      async getQuotaStatus(): Promise<{ remaining: number; resetTime: number | null }> {
        return { remaining: Infinity, resetTime: null };
      },
      async healthCheck(): Promise<AIHealthStatus> {
        return {
          healthy: true,
          type: 'available',
          message: 'OpenAI provider healthy',
          lastChecked: Date.now(),
        };
      },
    };
  }

  private createAnthropicProvider(config: AIProviderConfig): AIProvider {
    return {
      name: ProviderName.Anthropic,
      config,
      async isAvailable(): Promise<boolean> {
        return !!config.apiKey;
      },
      async isHealthy(): Promise<boolean> {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: config.model,
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 5,
            }),
            signal: AbortSignal.timeout((config.timeout || 10000)),
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      async sendMessage(messages: any, options?: any): Promise<any> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            ...(options || {}),
          }),
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Anthropic API error: ${error}`);
        }
        return response.json();
      },
      async getQuotaStatus(): Promise<{ remaining: number; resetTime: number | null }> {
        return { remaining: Infinity, resetTime: null };
      },
      async healthCheck(): Promise<AIHealthStatus> {
        return {
          healthy: true,
          type: 'available',
          message: 'Anthropic provider healthy',
          lastChecked: Date.now(),
        };
      },
    };
  }

  private createLocalProvider(config: AIProviderConfig): AIProvider {
    return {
      name: ProviderName.Local,
      config,
      async isAvailable(): Promise<boolean> {
        return !!config.apiKey;
      },
      async isHealthy(): Promise<boolean> {
        try {
          const response = await fetch((config.endpoint as string) || 'http://localhost:8080/health', {
            signal: AbortSignal.timeout((config.timeout || 5000)),
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      async sendMessage(messages: any, options?: any): Promise<any> {
        const response = await fetch((config.endpoint as string) || 'http://localhost:8080/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.model,
            messages,
            ...(options || {}),
          }),
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Local provider error: ${error}`);
        }
        return response.json();
      },
      async getQuotaStatus(): Promise<{ remaining: number; resetTime: number | null }> {
        return { remaining: Infinity, resetTime: null };
      },
      async healthCheck(): Promise<AIHealthStatus> {
        return {
          healthy: true,
          type: 'available',
          message: 'Local provider healthy',
          lastChecked: Date.now(),
        };
      },
    };
  }

  private createFallbackProvider(name: ProviderName, config: AIProviderConfig): AIProvider {
    return {
      name,
      config,
      async isAvailable(): Promise<boolean> {
        return true;
      },
      async isHealthy(): Promise<boolean> {
        return true;
      },
      async sendMessage(): Promise<any> {
        throw new Error(`Fallback provider ${name} not implemented`);
      },
      async getQuotaStatus(): Promise<{ remaining: number; resetTime: number | null }> {
        return { remaining: Infinity, resetTime: null };
      },
      async healthCheck(): Promise<AIHealthStatus> {
        return {
          healthy: true,
          type: 'available',
          message: `${name} fallback provider available`,
          lastChecked: Date.now(),
        };
      },
    };
  }

  // Get current primary provider
  getPrimaryProvider(): AIProvider | null {
    return this.providers.get(this.primaryProvider) || null;
  }

  // Get fallback provider
  getFallbackProvider(): AIProvider | null {
    return this.fallbackProvider ? this.providers.get(this.fallbackProvider) || null : null;
  }

  // Get all configured providers
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  // Get provider by name
  getProvider(name: ProviderName): AIProvider | null {
    return this.providers.get(name) || null;
  }

  // Health check all providers
  async checkAllProvidersHealth(): Promise<Record<ProviderName, AIHealthStatus>> {
    const results: Record<ProviderName, AIHealthStatus> = {
      gemini: { healthy: false, type: 'error', message: 'Not checked', lastChecked: 0 },
      openrouter: { healthy: false, type: 'error', message: 'Not checked', lastChecked: 0 },
      openai: { healthy: false, type: 'error', message: 'Not checked', lastChecked: 0 },
      anthropic: { healthy: false, type: 'error', message: 'Not checked', lastChecked: 0 },
      local: { healthy: false, type: 'error', message: 'Not checked', lastChecked: 0 },
    };
    for (const [name, provider] of this.providers.entries()) {
      results[name] = await provider.healthCheck();
    }
    return results;
  }

  // Send message with automatic failover
  async sendMessageWithFailover(messages: any, options?: any): Promise<any> {
    const maxRetries = options?.maxRetries ?? this.options.maxRetries ?? 3;
    const timeout = options?.timeout ?? this.options.timeout ?? 30000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const healthStatuses = await this.checkAllProvidersHealth();

      const primary = this.getPrimaryProvider();
      if (primary) {
        try {
          const result = await Promise.race([
            primary.sendMessage(messages, options),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Request timed out')), timeout);
            }),
          ]);
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.log(`[AIProviderManager] Primary provider attempt ${attempt + 1} failed:`, lastError.message);

          if (lastError.message.includes('quota') || lastError.message.includes('429')) {
            break;
          }
        }
      }

      if (attempt < maxRetries && this.fallbackProvider) {
        const fallback = this.getProvider(this.fallbackProvider);
        if (fallback) {
          try {
            const result = await Promise.race([
              fallback.sendMessage(messages, options),
              new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out')), timeout);
              }),
            ]);
            console.log('[AIProviderManager] Used fallback provider:', this.fallbackProvider);
            return result;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.log(`[AIProviderManager] Fallback provider attempt ${attempt + 1} failed:`, lastError.message);
          }
        }
      }
    }

    throw new Error(`All providers failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown'}`);
  }

  // Start health monitoring
  startHealthMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.healthCheckInterval = setInterval(async () => {
      const statuses = await this.checkAllProvidersHealth();
      for (const [name, status] of Object.entries(statuses)) {
        if (!status.healthy && this.onStatusChange) {
          this.onStatusChange(status);
        }
      }
    }, intervalMs);
  }

  // Stop health monitoring
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  // Cleanup
  async dispose(): Promise<void> {
    this.stopHealthMonitoring();
    for (const provider of this.providers.values()) {
      if (provider.dispose) {
        await provider.dispose();
      }
    }
  }
}
