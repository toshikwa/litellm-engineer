import { createCategoryLogger } from '../../../../common/logger'
import type { ServiceContext } from '../types'
import { LLM } from '../../../../types/llm'

// Create category logger for LiteLLM model service
const modelLogger = createCategoryLogger('litellm:model')

/**
 * LiteLLM Model API service class
 */
export class ModelService {
  private static readonly CACHE_LIFETIME = 1000 * 60 * 5 // 5 min
  private modelCache: { [key: string]: any } = {}

  constructor(private context: ServiceContext) {}

  /**
   * List available models from LiteLLM API
   */
  async listModels(): Promise<LLM[]> {
    try {
      // Get LiteLLM credentials from store
      const liteLLMConfig = this.context.store.get('litellm')
      if (!liteLLMConfig) {
        throw new Error('LiteLLM configuration not found')
      }

      const { apiKey, baseURL } = liteLLMConfig.credentials
      const cacheKey = `${baseURL}-${apiKey}`

      // Check cache first
      const cachedData = this.modelCache[cacheKey]
      if (
        cachedData &&
        cachedData._timestamp &&
        Date.now() - cachedData._timestamp < ModelService.CACHE_LIFETIME
      ) {
        return cachedData.filter((model: any) => !model._timestamp)
      }

      // Log request
      modelLogger.debug('Fetching models from LiteLLM API')

      // Make API call to LiteLLM
      const response = await fetch(`${baseURL}/v2/model/info`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      // Transform the response to match our LLM interface
      const data = await response.json()
      const models = this.transformModels(data)
      this.modelCache[cacheKey] = [...models, { _timestamp: Date.now() } as any]

      return models
    } catch (error: any) {
      modelLogger.error('Error fetching models from LiteLLM', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Transform LiteLLM model data to our LLM interface
   */
  private transformModels(data: any): LLM[] {
    if (!data.data || !Array.isArray(data.data)) {
      modelLogger.warn('Invalid model data format from LiteLLM API')
      return []
    }

    return data.data.map((model: any) => {
      const modelInfo = model.model_info || {}

      return {
        modelId: model.model_name,
        modelName: `${model.model_name} (LiteLLM)`,
        toolUse: modelInfo.supports_function_calling || modelInfo.supports_tool_choice || false,
        regions: ['default'],
        maxTokensLimit: modelInfo.max_tokens || 4096,
        supportsThinking: modelInfo.supported_openai_params?.includes('thinking') || false,
        provider: 'litellm'
      }
    })
  }
}
