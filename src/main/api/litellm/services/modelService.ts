import { createCategoryLogger } from '../../../../common/logger'
import type { ServiceContext } from '../types'
import { LLM } from '../../../../types/llm'

// Create category logger for LiteLLM model service
const modelLogger = createCategoryLogger('litellm:model')

/**
 * LiteLLM Model API service class
 */
export class ModelService {
  private static readonly CACHE_LIFETIME = 1000 * 5 // 5 sec
  private modelCache: { [key: string]: { models: LLM[]; timestamp: number } } = {}
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

      // Check cache first
      const { apiKey, baseURL } = liteLLMConfig.credentials
      const cacheKey = `${baseURL}-${apiKey}`
      const cachedData = this.modelCache[cacheKey]
      if (
        cachedData &&
        cachedData.timestamp &&
        Date.now() - cachedData.timestamp < ModelService.CACHE_LIFETIME
      ) {
        return cachedData.models
      }

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

      // Cache the models with a timestamp
      this.modelCache[cacheKey] = {
        models: models,
        timestamp: Date.now()
      }
      return this.transformModels(data)
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
    // Use a Map to avoid duplicates
    const modelMap = new Map<string, LLM>()
    data.data.forEach((model: any) => {
      const modelInfo = model.model_info || {}
      const modelId = model.model_name
      if (!modelMap.has(modelId)) {
        modelMap.set(modelId, {
          modelId: modelId,
          modelName: `${modelId} (LiteLLM)`,
          toolUse: modelInfo.supports_function_calling || modelInfo.supports_tool_choice || false,
          regions: ['default'],
          maxTokensLimit: modelInfo.max_tokens || 4096,
          supportsThinking: modelInfo.supported_openai_params?.includes('thinking') || false,
          provider: 'litellm'
        })
      }
    })
    return Array.from(modelMap.values())
  }
}
