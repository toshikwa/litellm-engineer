import { ConfigStore } from '../../../preload/store'
import { LiteLLMCredentials, LiteLLMConfig } from '../../../types/litellm'

// Re-export LiteLLM types
export type { LiteLLMCredentials, LiteLLMConfig }

/**
 * Service context for LiteLLM service
 * Reusing the same structure as Bedrock for compatibility
 */
export type ServiceContext = {
  store: ConfigStore
}
