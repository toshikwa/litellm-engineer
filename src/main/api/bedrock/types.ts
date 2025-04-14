import {
  GuardrailConfiguration,
  Message,
  SystemContentBlock,
  ToolConfiguration
} from '@aws-sdk/client-bedrock-runtime'
import { ConfigStore } from '../../../preload/store'

export type CallConverseAPIProps = {
  modelId: string
  messages: Message[]
  system: SystemContentBlock[]
  toolConfig?: ToolConfiguration
  guardrailConfig?: GuardrailConfiguration
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
