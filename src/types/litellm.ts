/**
 * Prompt caching type for LiteLLM
 */
export const LITELLM_SUPPORTED_CACHING_TYPES = ['none', 'claude', 'nova'] as const
export type PromptCachingType = (typeof LITELLM_SUPPORTED_CACHING_TYPES)[number]
export const LITELLM_CACHING_TYPE_DESCRIPTIONS: Record<PromptCachingType, string> = {
  none: 'No caching',
  claude: '3.7 Sonnet / 3.5 Haiku',
  nova: 'Micro / Lite / Pro'
}

export const LITELLM_SUPPORTED_REGIONS = ['default'] as const
export type LiteLLMSupportRegion = (typeof LITELLM_SUPPORTED_REGIONS)[number]

/**
 * LiteLLM API credentials
 */
export interface LiteLLMCredentials {
  apiKey: string
  baseURL: string
}

/**
 * LiteLLM configuration
 */
export interface LiteLLMConfig {
  credentials: LiteLLMCredentials
  enabled: boolean
  cachingType: PromptCachingType
}
