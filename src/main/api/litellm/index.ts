import { ConverseService } from './services/converseService'
import { ModelService } from './services/modelService'
import type { ServiceContext } from './types'
import type { CallConverseAPIProps } from '../bedrock/types'

/**
 * LiteLLM Service class
 * Provides access to LiteLLM API functionality
 */
export class LiteLLMService {
  private converseService: ConverseService
  private modelService: ModelService

  constructor(context: ServiceContext) {
    this.converseService = new ConverseService(context)
    this.modelService = new ModelService(context)
  }

  /**
   * List available models from LiteLLM API
   */
  async listModels() {
    return this.modelService.listModels()
  }

  /**
   * Non-streaming LiteLLM API call
   */
  async converse(props: CallConverseAPIProps) {
    return this.converseService.converse(props)
  }

  /**
   * Streaming LiteLLM API call
   */
  async converseStream(props: CallConverseAPIProps) {
    return this.converseService.converseStream(props)
  }
}

// Re-export types for convenience
export * from './types'
