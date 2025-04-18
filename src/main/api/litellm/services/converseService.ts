import {
  ConverseCommandOutput,
  ConverseStreamCommandOutput,
  Message,
  ContentBlock,
  StopReason,
  ToolConfiguration,
  SystemContentBlock
} from '@aws-sdk/client-bedrock-runtime'
import { createLiteLLMClient } from '../client'
import { createCategoryLogger } from '../../../../common/logger'
import type { ServiceContext } from '../types'
import type { CallConverseAPIProps } from '../../bedrock/types'
import { Stream } from 'openai/streaming'
import {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
  ChatCompletionTool,
  ChatCompletionRole,
  ChatCompletionToolMessageParam,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageToolCall,
  ChatCompletionSystemMessageParam
} from 'openai/resources'

// Create category logger for LiteLLM converse service
const converseLogger = createCategoryLogger('litellm:converse')

/**
 * LiteLLM Converse API service class
 * Implements the same interface as BedrockConverseService but uses LiteLLM API
 */
export class ConverseService {
  private static readonly MAX_RETRIES = 5
  private static readonly RETRY_DELAY = 1000

  constructor(private context: ServiceContext) {}

  /**
   * Non-streaming converse API call
   */
  async converse(props: CallConverseAPIProps, retries = 0): Promise<ConverseCommandOutput> {
    try {
      // Get LiteLLM credentials from store
      const liteLLMConfig = this.context.store.get('litellm')
      if (!liteLLMConfig) {
        throw new Error('LiteLLM configuration not found')
      }

      // Create LiteLLM client
      const client = createLiteLLMClient(liteLLMConfig.credentials)

      // Get parameters
      const inferenceParams = this.context.store.get('inferenceParams')
      let thinking = this.context.store.get('thinkingMode')
      if (thinking?.type === 'enabled' && thinking?.budget_tokens) {
        inferenceParams.temperature = 1
        inferenceParams.topP = undefined
      } else {
        thinking = undefined
      }

      // Make API call to LiteLLM
      const chatInput = {
        model: ConverseService.prepareModelId(props.modelId),
        messages: ConverseService.prepareMessages(props.messages, props.system),
        temperature: inferenceParams.temperature,
        top_p: inferenceParams.topP,
        tools: ConverseService.convertToolsToOpenAIFormat(props.toolConfig),
        thinking
      }
      const response = await client.chat.completions.create(chatInput)

      // Convert response to Bedrock format
      return ConverseService.convertToBedrock(response)
    } catch (error: any) {
      return this.handleError(error, props, retries, 'converse')
    }
  }

  /**
   * Streaming LiteLLM API call
   */
  async converseStream(
    props: CallConverseAPIProps,
    retries = 0
  ): Promise<ConverseStreamCommandOutput> {
    try {
      // Get LiteLLM credentials from store
      const liteLLMConfig = this.context.store.get('litellm')
      if (!liteLLMConfig) {
        throw new Error('LiteLLM configuration not found')
      }

      // Create LiteLLM client
      const client = createLiteLLMClient(liteLLMConfig.credentials)

      // Get parameters
      const inferenceParams = this.context.store.get('inferenceParams')
      let thinking = this.context.store.get('thinkingMode')
      if (thinking?.type === 'enabled' && thinking?.budget_tokens) {
        inferenceParams.temperature = 1
        inferenceParams.topP = undefined
      } else {
        thinking = undefined
      }

      // Make streaming API call to LiteLLM
      const chatInput = {
        model: ConverseService.prepareModelId(props.modelId),
        messages: ConverseService.prepareMessages(props.messages, props.system),
        temperature: inferenceParams.temperature,
        top_p: inferenceParams.topP,
        tools: ConverseService.convertToolsToOpenAIFormat(props.toolConfig),
        thinking,
        stream: true,
        stream_options: { include_usage: true }
      } as ChatCompletionCreateParamsStreaming
      const stream = await client.chat.completions.create(chatInput)

      // Convert stream to Bedrock format
      return ConverseService.convertStreamToBedrock(stream)
    } catch (error: any) {
      return this.handleError(error, props, retries, 'converseStream')
    }
  }

  /**
   * Prepare model id
   */
  private static prepareModelId(modelId: string): string {
    return modelId.replace('litellm:', '')
  }

  /**
   * Prepare messages for OpenAI format
   */
  private static prepareMessages(
    messages: Message[],
    system: SystemContentBlock[]
  ): ChatCompletionMessageParam[] {
    const result: ChatCompletionMessageParam[] = []

    // Add system message if provided
    if (system && system[0]?.text) {
      const useCache = system.some((block) => block.cachePoint?.type === 'default')
      result.push({
        role: 'system',
        content: system[0].text,
        cache_control: useCache ? { type: 'ephemeral' } : undefined
      } as ChatCompletionSystemMessageParam)
    }

    // Convert Bedrock messages to OpenAI format
    for (const message of messages) {
      if (!message.content) continue
      // Handle tool result
      if (message.content[0]?.toolResult?.content) {
        const c = message.content[0]
        if (c.toolResult && c.toolResult.content) {
          result.push({
            role: 'tool',
            tool_call_id: c.toolResult.toolUseId,
            content: JSON.stringify(c.toolResult.content),
            cache_control: ConverseService.convertCacheControl(message.content)
          } as ChatCompletionToolMessageParam)
        }
      } else {
        // Handle assistant or user messages
        result.push({
          role: ConverseService.convertRole(message.role),
          content: ConverseService.convertContent(message.content),
          tool_calls: ConverseService.convertToolCalls(message.content),
          cache_control: ConverseService.convertCacheControl(message.content)
        } as ChatCompletionMessageParam)
      }
    }
    return result
  }

  /**
   * Convert Bedrock role to OpenAI role format
   */
  private static convertRole(role: string | undefined): ChatCompletionRole {
    switch (role) {
      case 'user':
      case 'assistant':
      case 'system':
      case 'function':
      case 'tool':
        return role
      default:
        return 'user'
    }
  }

  /**
   * Convert Bedrock content blocks to OpenAI content parts
   */
  private static convertContent(
    blocks: ContentBlock[]
  ): string | ChatCompletionContentPart[] | undefined {
    const result: ChatCompletionContentPart[] = []
    for (const block of blocks) {
      if (block.text) {
        result.push({
          type: 'text',
          text: block.text
        })
      } else if (block.image && block.image.source?.bytes) {
        result.push({
          type: 'image_url',
          image_url: {
            url: `data:image/${block.image.format};base64,${block.image.source.bytes}`
          }
        })
      } else if (block.reasoningContent?.reasoningText?.text) {
        result.push({
          type: 'thinking',
          thinking: block.reasoningContent.reasoningText.text,
          signature: block.reasoningContent.reasoningText.signature
        } as any)
      }
    }
    if (result.length === 1 && result[0].type === 'text') {
      return result[0].text
    }
    return result.length > 0 ? result : undefined
  }

  /**
   * Convert Bedrock tool use to OpenAI format
   */
  private static convertToolCalls(
    blocks: ContentBlock[]
  ): ChatCompletionMessageToolCall[] | undefined {
    const result: ChatCompletionMessageToolCall[] = []
    for (const block of blocks) {
      if (block.toolUse && block.toolUse.toolUseId && block.toolUse.name) {
        result.push({
          id: block.toolUse.toolUseId,
          type: 'function',
          function: {
            name: block.toolUse.name,
            arguments: JSON.stringify(block.toolUse.input)
          }
        })
      }
    }
    return result.length > 0 ? result : undefined
  }

  /**
   * Convert Bedrock cache control to OpenAI format
   */
  private static convertCacheControl(blocks: ContentBlock[]): { type: 'ephemeral' } | undefined {
    return blocks.some((block) => block.cachePoint?.type === 'default')
      ? { type: 'ephemeral' }
      : undefined
  }

  /**
   * Convert OpenAI response to Bedrock format
   */
  private static convertToBedrock(response: any): ConverseCommandOutput {
    const choice = response.choices[0]
    const content: ContentBlock[] = []

    // Handle text content
    if (choice.message.content) {
      content.push({ text: choice.message.content })
    }

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type === 'function') {
          content.push({
            toolUse: {
              toolUseId: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments)
            }
          })
        }
      }
    }

    // Create a message with the model's response
    const message: Message = { role: 'assistant', content }

    // Map OpenAI finish_reason to Bedrock StopReason
    const stopReason = ConverseService.mapStopReason(choice.finish_reason)

    return {
      output: { message },
      stopReason,
      usage: {
        cacheReadInputTokens: response.usage?.cache_read_input_tokens,
        cacheWriteInputTokens: response.usage?.cache_creation_input_tokens,
        inputTokens: response.usage?.prompt_tokens - response.usage?.cache_read_input_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens + response.usage?.cache_creation_input_tokens
      },
      metrics: { latencyMs: 0 },
      $metadata: { httpStatusCode: 200 }
    }
  }

  /**
   * Convert Bedrock tools to OpenAI format
   * Transforms Bedrock tool configuration to OpenAI's expected format
   */
  private static convertToolsToOpenAIFormat(
    toolConfig?: ToolConfiguration
  ): ChatCompletionTool[] | undefined {
    let tools: ChatCompletionTool[] | undefined = undefined
    if (toolConfig?.tools && Array.isArray(toolConfig.tools) && toolConfig.tools.length > 0) {
      if (toolConfig.tools.length > 0) {
        tools = toolConfig.tools
          .filter((tool) => tool.toolSpec)
          .map((tool: any) => {
            const props = tool.toolSpec?.inputSchema?.json.properties ?? {}
            const properties = Object.fromEntries(
              Object.keys(props).map((key) => [
                key,
                {
                  type: props[key].type,
                  description: props[key].description
                }
              ])
            )
            return {
              type: 'function',
              function: {
                name: tool.toolSpec.name,
                description: tool.toolSpec.description,
                parameters: {
                  type: 'object',
                  properties
                },
                required: tool.toolSpec.inputSchema?.json?.required ?? []
              }
            }
          })
      }
    }
    return tools
  }

  /**
   * Map OpenAI finish_reason to Bedrock StopReason
   */
  private static mapStopReason(finishReason: string): StopReason {
    switch (finishReason) {
      case 'stop':
        return 'end_turn'
      case 'length':
        return 'max_tokens'
      case 'content_filter':
        return 'content_filtered'
      case 'tool_calls':
        return 'tool_use'
      default:
        return 'end_turn'
    }
  }

  /**
   * Convert OpenAI stream to Bedrock format
   */
  private static convertStreamToBedrock(stream: Stream<any>): ConverseStreamCommandOutput {
    // Store reference to the instance for use in the generator
    const transformedStream = {
      [Symbol.asyncIterator]: async function* () {
        let isFirstChunk = true
        let contentBlockIndex = 0
        let mode = undefined as 'text' | 'thinking' | 'tool' | undefined

        for await (const chunk of stream) {
          // Send usage data
          if (chunk.usage) {
            yield {
              metadata: {
                usage: {
                  cacheReadInputTokens: chunk.usage?.cache_read_input_tokens,
                  cacheWriteInputTokens: chunk.usage?.cache_creation_input_tokens,
                  inputTokens: chunk.usage?.prompt_tokens - chunk.usage?.cache_read_input_tokens,
                  outputTokens: chunk.usage?.completion_tokens,
                  totalTokens: chunk.usage?.total_tokens + chunk.usage?.cache_creation_input_tokens
                }
              }
            }
          }

          // Skip empty chunks
          if (!chunk.choices || chunk.choices.length === 0) continue

          // For the first chunk, emit a messageStart event
          if (isFirstChunk) {
            yield { messageStart: { role: 'assistant' } }
            isFirstChunk = false
          }

          // Handle different chunk types
          const choice = chunk.choices[0]
          if (choice.delta) {
            // Text content
            if (choice.delta.content) {
              if (mode !== 'text') {
                if (contentBlockIndex > 0) {
                  yield { contentBlockStop: { contentBlockIndex } }
                }
                if (mode) {
                  contentBlockIndex++
                }
                mode = 'text'
              }
              yield {
                contentBlockDelta: {
                  contentBlockIndex,
                  delta: { text: choice.delta.content }
                }
              }
            }

            // Reasoning
            if (choice.delta.reasoning_content) {
              if (mode !== 'thinking') {
                if (contentBlockIndex > 0) {
                  yield { contentBlockStop: { contentBlockIndex } }
                }
                if (mode) {
                  contentBlockIndex++
                }
                mode = 'thinking'
              }
              yield {
                contentBlockDelta: {
                  contentBlockIndex,
                  delta: {
                    reasoningContent: {
                      text: choice.delta.reasoning_content
                    }
                  }
                }
              }
            }
            if (choice.delta.thinking_blocks?.[0]?.signature) {
              yield {
                contentBlockDelta: {
                  contentBlockIndex,
                  delta: {
                    reasoningContent: {
                      signature: choice.delta.thinking_blocks[0].signature
                    }
                  }
                }
              }
            }

            // Tool use
            if (choice.delta.tool_calls) {
              for (const toolCall of choice.delta.tool_calls) {
                if (mode !== 'tool') {
                  if (contentBlockIndex > 0) {
                    yield { contentBlockStop: { contentBlockIndex } }
                  }
                  contentBlockIndex++
                  if (toolCall?.function?.name) {
                    yield {
                      contentBlockStart: {
                        contentBlockIndex,
                        start: {
                          toolUse: {
                            name: toolCall.function.name,
                            toolUseId: toolCall.id
                          }
                        }
                      }
                    }
                  }
                  mode = 'tool'
                } else if (
                  toolCall?.function.arguments &&
                  toolCall.function.arguments.trim() !== '{}'
                ) {
                  yield {
                    contentBlockDelta: {
                      contentBlockIndex,
                      delta: { toolUse: { input: toolCall.function.arguments } }
                    }
                  }
                }
              }
            }
          }

          // Handle finish reason
          if (choice.finish_reason) {
            yield { contentBlockStop: { contentBlockIndex } }
            yield {
              messageStop: { stopReason: ConverseService.mapStopReason(choice.finish_reason) }
            }
          }
        }
      }
    }
    return {
      stream: transformedStream as any,
      $metadata: { httpStatusCode: 200 }
    }
  }

  /**
   * Handle errors from LiteLLM API
   */
  private async handleError<T extends ConverseCommandOutput | ConverseStreamCommandOutput>(
    error: any,
    props: CallConverseAPIProps,
    retries: number,
    methodName: 'converse' | 'converseStream'
  ): Promise<T> {
    // Log error with more details
    converseLogger.error(`Error in ${methodName}`, {
      errorName: error.name,
      errorMessage: error.message,
      modelId: props.modelId,
      stack: error.stack,
      status: error.status || 'unknown',
      statusText: error.statusText || 'unknown',
      responseData: error.response?.data || 'no response data',
      hasToolConfig: !!props.toolConfig,
      toolCount: props.toolConfig?.tools?.length || 0
    })

    // Log the full error object for debugging
    console.error('Full error object:', JSON.stringify(error, null, 2))

    // Retry on certain errors
    if (
      (error.status === 429 || error.status === 500 || error.status === 503) &&
      retries < ConverseService.MAX_RETRIES
    ) {
      converseLogger.warn(`Retrying ${methodName} due to error`, {
        retry: retries,
        errorName: error.name,
        message: error.message,
        modelId: props.modelId
      })

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, ConverseService.RETRY_DELAY))

      // Retry the request
      return methodName === 'converse'
        ? ((await this.converse(props, retries + 1)) as T)
        : ((await this.converseStream(props, retries + 1)) as T)
    }
    throw error
  }
}
