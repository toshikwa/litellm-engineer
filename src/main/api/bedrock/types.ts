import { Message, SystemContentBlock, ToolConfiguration } from '@aws-sdk/client-bedrock-runtime'
import { ConfigStore } from '../../../preload/store'

export interface GuardrailConfig {
  guardrailIdentifier: string
  guardrailVersion: string
  trace?: 'enabled' | 'disabled'
}

export type CallConverseAPIProps = {
  modelId: string
  messages: Message[]
  system: SystemContentBlock[]
  toolConfig?: ToolConfiguration
  guardrailConfig?: GuardrailConfig
}

export type AWSCredentials = {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region: string
  profile?: string
  useProfile?: boolean
}

export interface ThinkingMode {
  type: 'enabled' | 'disabled'
  budget_tokens?: number
}

export type InferenceParams = {
  maxTokens: number
  temperature: number
  topP?: number
  thinking?: ThinkingMode
}

export type ServiceContext = {
  store: ConfigStore
}
