import { getDefaultPromptRouter, getModelsForRegion } from '../models'
import { getAccountId } from '../utils/awsUtils'
import type { ServiceContext, AWSCredentials } from '../types'
import { BedrockSupportRegion, LLM } from '../../../../types/llm'

export class ModelService {
  private static readonly CACHE_LIFETIME = 1000 * 60 * 5 // 5 min
  private modelCache: { [key: string]: { models: LLM[]; timestamp: number } } = {}

  constructor(private context: ServiceContext) {}

  async listModels() {
    const awsCredentials = this.context.store.get('aws') as AWSCredentials
    const { region, accessKeyId, useProfile } = awsCredentials

    // AWS認証情報のバリデーション
    if (!region || (!useProfile && !accessKeyId)) {
      console.warn('AWS credentials not configured properly')
      return []
    }

    const cacheKey = useProfile
      ? `${region}-${awsCredentials.profile || 'default'}`
      : `${region}-${accessKeyId}`
    const cachedData = this.modelCache[cacheKey]

    if (
      cachedData &&
      cachedData.timestamp &&
      Date.now() - cachedData.timestamp < ModelService.CACHE_LIFETIME
    ) {
      return cachedData.models
    }

    try {
      const models = getModelsForRegion(region as BedrockSupportRegion)

      const accountId = await getAccountId(awsCredentials)
      const promptRouterModels = accountId ? getDefaultPromptRouter(accountId, region) : []
      const result = [...models, ...promptRouterModels]
      this.modelCache[cacheKey] = {
        models: models,
        timestamp: Date.now()
      }

      return result
    } catch (error) {
      console.error('Error in listModels:', error)
      return []
    }
  }
}
