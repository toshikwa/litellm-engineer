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
}
