import { OpenAI } from 'openai'
import type { LiteLLMCredentials } from '../../../types/litellm'

/**
 * Creates an OpenAI client configured to use LiteLLM proxy
 * @param credentials LiteLLM API credentials
 * @returns OpenAI client instance
 */
export function createLiteLLMClient(credentials: LiteLLMCredentials) {
  return new OpenAI({
    apiKey: credentials.apiKey,
    baseURL: credentials.baseURL
  })
}
