import { trackAiUsage } from '~/lib/ai-usage-tracking';
import { AiProvider } from '@prisma/client';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityCompletionParams {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  top_p?: number;
  return_citations?: boolean;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: string;
  stream?: boolean;
}

interface PerplexityUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  usage?: PerplexityUsage;
  citations?: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
}

interface TrackedPerplexityOptions {
  apiKey: string;
  userId: string;
  metadata?: Record<string, any>;
}

export class TrackedPerplexity {
  private apiKey: string;
  private userId: string;
  private metadata?: Record<string, any>;
  private baseUrl = 'https://api.perplexity.ai';

  constructor({ apiKey, userId, metadata }: TrackedPerplexityOptions) {
    this.apiKey = apiKey;
    this.userId = userId;
    this.metadata = metadata;
  }

  async createChatCompletion(params: PerplexityCompletionParams): Promise<PerplexityResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();

      // Track usage if available
      if (data.usage) {
        await trackAiUsage({
          userId: this.userId,
          provider: AiProvider.PERPLEXITY,
          model: params.model,
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          endpoint: 'chat.completions',
          metadata: {
            ...this.metadata,
            requestId: data.id,
            citations: data.citations?.length || 0,
          },
        });
      }

      return data;
    } catch (error) {
      console.error('Perplexity API error:', error);
      throw error;
    }
  }

  async createStreamingChatCompletion(params: PerplexityCompletionParams) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...params, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      let requestId = '';
      let citations: string[] = [];

      // Create tracked stream
      const userId = this.userId;
      const metadata = this.metadata;
      const trackedStream = async function* () {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const chunk = JSON.parse(jsonStr) as PerplexityResponse;
                
                yield chunk;

                // Collect data for tracking
                if (chunk.choices[0]?.delta?.content) {
                  fullContent += chunk.choices[0].delta.content;
                }

                if (chunk.id) {
                  requestId = chunk.id;
                }

                if (chunk.citations) {
                  citations = chunk.citations;
                }

                if (chunk.usage) {
                  promptTokens = chunk.usage.prompt_tokens || 0;
                  completionTokens = chunk.usage.completion_tokens || 0;
                }
              } catch (e) {
                console.error('Failed to parse chunk:', e);
              }
            }
          }
        }

        // Estimate tokens if not provided
        if (!promptTokens && !completionTokens) {
          const promptText = JSON.stringify(params.messages);
          promptTokens = Math.ceil(promptText.length / 4);
          completionTokens = Math.ceil(fullContent.length / 4);
        }

        // Track usage after stream completes
        await trackAiUsage({
          userId: userId,
          provider: AiProvider.PERPLEXITY,
          model: params.model,
          promptTokens,
          completionTokens,
          endpoint: 'chat.completions.stream',
          metadata: {
            ...metadata,
            requestId,
            streaming: true,
            citations: citations.length,
          },
        });
      };

      return trackedStream();
    } catch (error) {
      console.error('Perplexity streaming error:', error);
      throw error;
    }
  }
}

// Helper function to create tracked Perplexity client
export function createTrackedPerplexity(userId: string, metadata?: Record<string, any>) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  return new TrackedPerplexity({
    apiKey,
    userId,
    metadata,
  });
}