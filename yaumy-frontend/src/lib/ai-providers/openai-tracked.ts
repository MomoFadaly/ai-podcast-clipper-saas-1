import OpenAI from 'openai';
import { trackAiUsage } from '~/lib/ai-usage-tracking';
import { AiProvider } from '@prisma/client';

interface TrackedOpenAIOptions {
  apiKey: string;
  userId: string;
  metadata?: Record<string, any>;
}

export class TrackedOpenAI {
  private client: OpenAI;
  private userId: string;
  private metadata?: Record<string, any>;

  constructor({ apiKey, userId, metadata }: TrackedOpenAIOptions) {
    this.client = new OpenAI({ apiKey });
    this.userId = userId;
    this.metadata = metadata;
  }

  async createChatCompletion(params: OpenAI.ChatCompletionCreateParams) {
    try {
      const response = await this.client.chat.completions.create(params);
      
      // Check if response is a stream or completion
      if ('usage' in response && response.usage) {
        await trackAiUsage({
          userId: this.userId,
          provider: AiProvider.OPENAI,
          model: params.model,
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          endpoint: 'chat.completions',
          metadata: {
            ...this.metadata,
            requestId: response.id,
            systemFingerprint: response.system_fingerprint,
          },
        });
      }
      
      return response;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async createStreamingChatCompletion(params: OpenAI.ChatCompletionCreateParams) {
    try {
      const stream = await this.client.chat.completions.create({
        ...params,
        stream: true,
      });
      
      // For streaming, we need to collect the response to count tokens
      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      const model = params.model;
      let requestId = '';
      
      // Create a new stream that tracks usage
      const userId = this.userId;
      const metadata = this.metadata;
      const trackedStream = async function* () {
        for await (const chunk of stream) {
          yield chunk;
          
          // Collect data for tracking
          if (chunk.choices[0]?.delta?.content) {
            fullContent += chunk.choices[0].delta.content;
          }
          
          if (chunk.id) {
            requestId = chunk.id;
          }
          
          // Some providers include usage in the final chunk
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens || 0;
            completionTokens = chunk.usage.completion_tokens || 0;
          }
        }
        
        // Estimate tokens if not provided (rough estimation)
        if (!promptTokens && !completionTokens) {
          // Estimate prompt tokens from messages
          const promptText = JSON.stringify(params.messages);
          promptTokens = Math.ceil(promptText.length / 4); // Rough estimate: 1 token ≈ 4 chars
          
          // Estimate completion tokens from response
          completionTokens = Math.ceil(fullContent.length / 4);
        }
        
        // Track usage after stream completes
        await trackAiUsage({
          userId: userId,
          provider: AiProvider.OPENAI,
          model,
          promptTokens,
          completionTokens,
          endpoint: 'chat.completions.stream',
          metadata: {
            ...metadata,
            requestId,
            streaming: true,
          },
        });
      };
      
      return trackedStream();
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw error;
    }
  }

  // Add other OpenAI methods as needed (embeddings, etc.)
  async createEmbedding(params: OpenAI.EmbeddingCreateParams) {
    try {
      const response = await this.client.embeddings.create(params);
      
      // Track usage
      if (response.usage) {
        await trackAiUsage({
          userId: this.userId,
          provider: AiProvider.OPENAI,
          model: params.model,
          promptTokens: response.usage.prompt_tokens,
          completionTokens: 0, // Embeddings don't have completion tokens
          endpoint: 'embeddings',
          metadata: this.metadata,
        });
      }
      
      return response;
    } catch (error) {
      console.error('OpenAI embeddings error:', error);
      throw error;
    }
  }
}

// Helper function to create tracked OpenAI client with current user
export function createTrackedOpenAI(userId: string, metadata?: Record<string, any>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  return new TrackedOpenAI({
    apiKey,
    userId,
    metadata,
  });
}