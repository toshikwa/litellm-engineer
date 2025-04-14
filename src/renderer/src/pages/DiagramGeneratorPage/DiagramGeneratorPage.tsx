import { useState, useRef, useEffect, useMemo } from 'react'
import { DrawIoEmbed, DrawIoEmbedRef } from 'react-drawio'
import { useAgentChat } from '../ChatPage/hooks/useAgentChat'
import { TextArea } from '../ChatPage/components/InputForm/TextArea'
import useSetting from '@renderer/hooks/useSetting'
import { Loader } from '@renderer/components/Loader'
import { exampleDiagrams } from './example-diagrams'
import { useRecommendDiagrams } from './hooks/useRecommendDiagrams'
import { RecommendDiagrams } from './components/RecommendDiagrams'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { WebLoader } from '../../components/WebLoader'
import { DeepSearchButton } from '@renderer/components/DeepSearchButton'
import { extractDrawioXml } from './utils/xmlParser'
import { DIAGRAM_GENERATOR_SYSTEM_PROMPT } from '../ChatPage/constants/DEFAULT_AGENTS'

export default function DiagramGeneratorPage() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  const [userInput, setUserInput] = useState('')
  const [xml, setXml] = useState(exampleDiagrams['serverless'])
  const [isComposing, setIsComposing] = useState(false)
  const drawioRef = useRef<DrawIoEmbedRef>(null)
  const { currentLLM: llm, sendMsgKey, getAgentTools } = useSetting()

  // 検索機能の状態
  const [enableSearch, setEnableSearch] = useState(false)

  // 履歴管理用の状態
  const [diagramHistory, setDiagramHistory] = useState<{ xml: string; prompt: string }[]>([])
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null)

  const { recommendDiagrams, recommendLoading, getRecommendDiagrams } = useRecommendDiagrams()

  const {
    t,
    i18n: { language }
  } = useTranslation()

  // カスタムシステムプロンプトを定義 - 言語設定と検索機能の有効化に対応
  const getSystemPrompt = () => {
    // デフォルトのプロンプトをベースに言語設定と検索機能の状態に応じて調整
    let basePrompt = DIAGRAM_GENERATOR_SYSTEM_PROMPT

    // 言語設定を追加
    basePrompt = basePrompt.replace(
      'Respond in the following languages included in the user request.',
      `Respond in the following languages: ${language}.`
    )

    // 検索機能が無効の場合、関連する部分を削除
    if (!enableSearch) {
      basePrompt = basePrompt.replace(
        "* If the user's request requires specific information, use the tavilySearch tool to gather up-to-date information before creating the diagram.",
        ''
      )
    }

    return basePrompt
  }

  const systemPrompt = getSystemPrompt()

  // ダイアグラム生成用のエージェントID
  const diagramAgentId = 'diagramGeneratorAgent'

  // Diagram Generator Agent で利用可能なツールを定義
  // enableSearch が true の場合のみ tavilySearch ツールを有効にする
  const diagramAgentTools = useMemo(() => {
    if (!enableSearch) return []

    // diagramAgentIdからツールを取得し、tavilySearch ツールのみをフィルタリング
    return getAgentTools(diagramAgentId).filter(
      (tool) => tool.toolSpec?.name === 'tavilySearch' && tool.enabled
    )
  }, [enableSearch, getAgentTools, diagramAgentId])

  const { messages, loading, handleSubmit, executingTool } = useAgentChat(
    llm?.modelId,
    systemPrompt,
    diagramAgentId,
    undefined,
    {
      enableHistory: false,
      tools: diagramAgentTools // 明示的にツール設定を渡す
    }
  )

  const onSubmit = (input: string) => {
    handleSubmit(input)
    setUserInput('')
    // 履歴から選択していた場合はリセット
    setSelectedHistoryIndex(null)
  }

  // システムプロンプトを検索状態に応じて更新
  useEffect(() => {
    // systemPromptは関数から取得するため、enableSearchが変更されたときに再レンダリングされる
  }, [enableSearch])

  // 最後のアシスタントメッセージから XML を取得して draw.io に設定
  useEffect(() => {
    const lastAssistantMessage = messages.filter((m) => m.role === 'assistant').pop()
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()

    if (lastAssistantMessage?.content && !loading && drawioRef.current) {
      const rawContent = lastAssistantMessage.content
        .map((c) => ('text' in c ? c.text : ''))
        .join('')
      // XMLパーサーを使用して有効なDrawIO XMLだけを抽出
      const xml = extractDrawioXml(rawContent) || rawContent

      if (xml) {
        try {
          drawioRef.current.load({ xml })
          setXml(xml)
          // Generate new recommendations based on the current diagram
          getRecommendDiagrams(xml)

          // 履歴に追加
          if (lastUserMessage?.content) {
            const userPrompt = lastUserMessage.content
              .map((c) => ('text' in c ? c.text : ''))
              .join('')
            setDiagramHistory((prev) => {
              const newHistory = [...prev, { xml, prompt: userPrompt }]
              // 最大10つまで保持
              return newHistory.slice(-10)
            })
          }
        } catch (error) {
          console.error('Failed to load diagram:', error)
          // XMLの解析に失敗した場合、エラーメッセージをコンソールに表示
          console.error('Invalid XML content:', rawContent)
        }
      }
    }
  }, [messages, loading])

  // 履歴からダイアグラムを読み込む関数
  const loadDiagramFromHistory = (index: number) => {
    if (diagramHistory[index]) {
      const historyItem = diagramHistory[index]
      if (drawioRef.current) {
        try {
          drawioRef.current.load({ xml: historyItem.xml })
          setXml(historyItem.xml)
          setUserInput(historyItem.prompt)
          setSelectedHistoryIndex(index)
        } catch (error) {
          console.error('Failed to load diagram from history:', error)
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] overflow-y-auto">
      <div className="flex pb-2 justify-between">
        <span className="font-bold flex flex-col gap-2 w-full">
          <div className="flex justify-between">
            <h1 className="content-center dark:text-white text-lg">Diagram Generator</h1>
          </div>
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {diagramHistory.map((_history, index) => (
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  key={index}
                  className={`p-1 px-3 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500 dark:text-white ${
                    selectedHistoryIndex === index
                      ? 'bg-gray-300 text-gray-800 dark:bg-gray-500 dark:text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-600'
                  }`}
                  onClick={() => loadDiagramFromHistory(index)}
                >
                  {index + 1}
                </motion.span>
              ))}
            </div>
          </div>
        </span>
      </div>

      <div className="flex-1 rounded-lg">
        {loading ? (
          <div className="flex h-[95%] justify-center items-center flex-col">
            {executingTool === 'tavilySearch' ? <WebLoader /> : <Loader />}
          </div>
        ) : (
          <div className="w-full h-[95%] border border-gray-200">
            <DrawIoEmbed
              ref={drawioRef}
              xml={xml}
              configuration={{
                defaultLibraries: 'aws4;aws3;aws3d'
              }}
              urlParameters={{
                dark: isDark,
                lang: language
              }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 fixed bottom-0 left-[5rem] right-5 bottom-3">
        <div className="relative w-full">
          <div className="flex gap-2 justify-between pb-2">
            <div className="overflow-x-auto flex-grow w-full">
              <RecommendDiagrams
                loading={recommendLoading}
                recommendations={recommendDiagrams}
                onSelect={setUserInput}
                loadingText={t('addRecommend', 'Generating recommendations...')}
              />
            </div>

            <div className="flex gap-3 items-center">
              <DeepSearchButton
                enableDeepSearch={enableSearch}
                handleToggleDeepSearch={() => setEnableSearch(!enableSearch)}
              />
            </div>
          </div>

          <TextArea
            value={userInput}
            onChange={setUserInput}
            disabled={loading}
            onSubmit={onSubmit}
            isComposing={isComposing}
            setIsComposing={setIsComposing}
            sendMsgKey={sendMsgKey}
          />
        </div>
      </div>
    </div>
  )
}
