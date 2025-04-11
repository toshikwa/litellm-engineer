import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IdentifiableMessage } from '@/types/chat/message'
import { Pie, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from 'chart.js'
import { Modal } from 'flowbite-react'
import { calculateCost, formatCurrency, modelPricing } from '@renderer/lib/pricing/modelPricing'

// Chart.jsコンポーネントを登録
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
)

interface TokenAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  messages: IdentifiableMessage[]
  modelId: string
}

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
}

interface CostAnalysis {
  inputCost: number
  outputCost: number
  cacheReadCost: number
  cacheWriteCost: number
  totalCost: number
  cacheSavings: number // プロンプトキャッシュによる削減額
}

interface TimeSeriesDataPoint {
  timestamp: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  cacheReadCost: number
  cacheWriteCost: number
  totalCost: number
}

interface Analytics {
  tokenUsage: TokenUsage
  costAnalysis: CostAnalysis
  timeSeriesData: TimeSeriesDataPoint[]
}

// メッセージからトークン使用量とコストを計算する関数
const calculateAnalytics = (messages: IdentifiableMessage[], modelId: string): Analytics => {
  // 初期値を設定
  const tokenUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0
  }

  const costAnalysis: CostAnalysis = {
    inputCost: 0,
    outputCost: 0,
    cacheReadCost: 0,
    cacheWriteCost: 0,
    totalCost: 0,
    cacheSavings: 0
  }

  // 時系列データを格納する配列
  const timeSeriesData: TimeSeriesDataPoint[] = []

  // アシスタントメッセージのメタデータからトークン使用量を集計
  messages.forEach((message) => {
    if (message.role === 'assistant' && message.metadata?.converseMetadata?.usage) {
      const usage = message.metadata.converseMetadata.usage

      // トークン使用量を加算
      tokenUsage.inputTokens += usage.inputTokens || 0
      tokenUsage.outputTokens += usage.outputTokens || 0
      tokenUsage.cacheReadTokens += usage.cacheReadInputTokens || 0
      tokenUsage.cacheWriteTokens += usage.cacheWriteInputTokens || 0

      // メッセージごとのコスト計算
      const msgInputCost = calculateCost(modelId, usage.inputTokens || 0, 0, 0, 0)
      const msgOutputCost = calculateCost(modelId, 0, usage.outputTokens || 0, 0, 0)
      const msgCacheReadCost = calculateCost(modelId, 0, 0, usage.cacheReadInputTokens || 0, 0)
      const msgCacheWriteCost = calculateCost(modelId, 0, 0, 0, usage.cacheWriteInputTokens || 0)
      const msgTotalCost = msgInputCost + msgOutputCost + msgCacheReadCost + msgCacheWriteCost

      // タイムスタンプの取得（メタデータにタイムスタンプがない場合は現在時刻を使用）
      const timestamp = message.timestamp || Date.now()

      // 時系列データポイントを追加
      timeSeriesData.push({
        timestamp,
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        cacheReadTokens: usage.cacheReadInputTokens || 0,
        cacheWriteTokens: usage.cacheWriteInputTokens || 0,
        totalTokens:
          (usage.inputTokens || 0) +
          (usage.outputTokens || 0) +
          (usage.cacheReadInputTokens || 0) +
          (usage.cacheWriteInputTokens || 0),
        inputCost: msgInputCost,
        outputCost: msgOutputCost,
        cacheReadCost: msgCacheReadCost,
        cacheWriteCost: msgCacheWriteCost,
        totalCost: msgTotalCost
      })
    }
  })

  // 時系列データを時間順にソート
  timeSeriesData.sort((a, b) => a.timestamp - b.timestamp)

  // 合計トークン数を計算
  tokenUsage.totalTokens =
    tokenUsage.inputTokens +
    tokenUsage.outputTokens +
    tokenUsage.cacheReadTokens +
    tokenUsage.cacheWriteTokens

  // コスト計算
  if (modelId) {
    costAnalysis.inputCost = calculateCost(modelId, tokenUsage.inputTokens, 0, 0, 0)
    costAnalysis.outputCost = calculateCost(modelId, 0, tokenUsage.outputTokens, 0, 0)
    costAnalysis.cacheReadCost = calculateCost(modelId, 0, 0, tokenUsage.cacheReadTokens, 0)
    costAnalysis.cacheWriteCost = calculateCost(modelId, 0, 0, 0, tokenUsage.cacheWriteTokens)
    costAnalysis.totalCost =
      costAnalysis.inputCost +
      costAnalysis.outputCost +
      costAnalysis.cacheReadCost +
      costAnalysis.cacheWriteCost

    // キャッシュによる削減額の計算
    if (tokenUsage.cacheReadTokens > 0) {
      // モデルIDからモデルタイプを特定
      const pricing = Object.entries(modelPricing).find(([key]) => modelId.includes(key))?.[1]
      if (pricing) {
        // キャッシュがなかった場合のコスト (通常の入力トークン価格で計算)
        const costWithoutCache = (tokenUsage.cacheReadTokens * pricing.input) / 1000
        // 実際のキャッシュコスト
        const actualCacheCost = (tokenUsage.cacheReadTokens * pricing.cacheRead) / 1000
        // 削減額を計算
        costAnalysis.cacheSavings = costWithoutCache - actualCacheCost
      }
    }
  }

  return { tokenUsage, costAnalysis, timeSeriesData }
}

// トークン使用量グラフのデータを作成
const createTokenChartData = (tokenUsage: TokenUsage, t: any): ChartData<'pie'> => {
  return {
    labels: [
      t('Input Tokens'),
      t('Output Tokens'),
      t('Cache Read Tokens'),
      t('Cache Write Tokens')
    ],
    datasets: [
      {
        data: [
          tokenUsage.inputTokens,
          tokenUsage.outputTokens,
          tokenUsage.cacheReadTokens,
          tokenUsage.cacheWriteTokens
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)', // 青
          'rgba(75, 192, 192, 0.6)', // 緑
          'rgba(255, 206, 86, 0.6)', // 黄
          'rgba(255, 159, 64, 0.6)' // オレンジ
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }
    ]
  }
}

// コスト分析グラフのデータを作成
const createCostChartData = (costAnalysis: CostAnalysis, t: any): ChartData<'pie'> => {
  return {
    labels: [t('Input Cost'), t('Output Cost'), t('Cache Read Cost'), t('Cache Write Cost')],
    datasets: [
      {
        data: [
          costAnalysis.inputCost,
          costAnalysis.outputCost,
          costAnalysis.cacheReadCost,
          costAnalysis.cacheWriteCost
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)', // 青
          'rgba(75, 192, 192, 0.6)', // 緑
          'rgba(255, 206, 86, 0.6)', // 黄
          'rgba(255, 159, 64, 0.6)' // オレンジ
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }
    ]
  }
}

// 時系列トークン使用量グラフのデータを作成
const createTokenTimeSeriesData = (
  timeSeriesData: TimeSeriesDataPoint[],
  t: any
): ChartData<'line'> => {
  // 時間フォーマット関数
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return {
    labels: timeSeriesData.map((data) => formatTime(data.timestamp)),
    datasets: [
      {
        label: t('Total Tokens'),
        data: timeSeriesData.map((data) => data.totalTokens),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.1
      },
      {
        label: t('Input Tokens'),
        data: timeSeriesData.map((data) => data.inputTokens),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        tension: 0.1
      },
      {
        label: t('Output Tokens'),
        data: timeSeriesData.map((data) => data.outputTokens),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
        tension: 0.1
      },
      {
        label: t('Cache Read Tokens'),
        data: timeSeriesData.map((data) => data.cacheReadTokens),
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        fill: true,
        tension: 0.1
      },
      {
        label: t('Cache Write Tokens'),
        data: timeSeriesData.map((data) => data.cacheWriteTokens),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: true,
        tension: 0.1
      }
    ]
  }
}

// 時系列コスト分析グラフのデータを作成
const createCostTimeSeriesData = (
  timeSeriesData: TimeSeriesDataPoint[],
  t: any
): ChartData<'line'> => {
  // 時間フォーマット関数
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return {
    labels: timeSeriesData.map((data) => formatTime(data.timestamp)),
    datasets: [
      {
        label: t('Total Cost'),
        data: timeSeriesData.map((data) => data.totalCost),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.1
      },
      {
        label: t('Input Cost'),
        data: timeSeriesData.map((data) => data.inputCost),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        tension: 0.1
      },
      {
        label: t('Output Cost'),
        data: timeSeriesData.map((data) => data.outputCost),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
        tension: 0.1
      },
      {
        label: t('Cache Read Cost'),
        data: timeSeriesData.map((data) => data.cacheReadCost),
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        fill: true,
        tension: 0.1
      },
      {
        label: t('Cache Write Cost'),
        data: timeSeriesData.map((data) => data.cacheWriteCost),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: true,
        tension: 0.1
      }
    ]
  }
}

// 円グラフのオプション
const pieChartOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 20
      }
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          const label = context.label || ''
          const value = context.raw as number
          return `${label}: ${value.toLocaleString()}`
        }
      }
    }
  }
}

// 折れ線グラフのオプション
const lineChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true
    }
  },
  plugins: {
    legend: {
      position: 'top'
    },
    tooltip: {
      mode: 'index',
      intersect: false
    },
    title: {
      display: true,
      text: ''
    }
  }
}

// モーダルコンポーネント
export const TokenAnalyticsModal: React.FC<TokenAnalyticsModalProps> = ({
  isOpen,
  onClose,
  messages,
  modelId
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'summary' | 'timeSeries'>('summary')

  // メッセージからトークン使用量とコストを計算
  const analytics = useMemo(() => calculateAnalytics(messages, modelId), [messages, modelId])

  // グラフデータを作成
  const tokenChartData = useMemo(
    () => createTokenChartData(analytics.tokenUsage, t),
    [analytics.tokenUsage, t]
  )
  const costChartData = useMemo(
    () => createCostChartData(analytics.costAnalysis, t),
    [analytics.costAnalysis, t]
  )

  // 時系列グラフデータを作成
  const tokenTimeSeriesData = useMemo(
    () => createTokenTimeSeriesData(analytics.timeSeriesData, t),
    [analytics.timeSeriesData, t]
  )
  const costTimeSeriesData = useMemo(
    () => createCostTimeSeriesData(analytics.timeSeriesData, t),
    [analytics.timeSeriesData, t]
  )

  // タブ切り替え関数
  const handleTabChange = (tab: 'summary' | 'timeSeries') => {
    setActiveTab(tab)
  }

  return (
    <Modal show={isOpen} onClose={onClose} size="6xl" dismissible>
      <Modal.Header>
        <h2 className="text-xl font-bold">{t('Token Usage Analytics')}</h2>
      </Modal.Header>
      <Modal.Body className="max-h-[80vh] overflow-y-auto">
        {/* セッション全体の統計 */}
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 dark:text-white">{t('Session Summary')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('Total Tokens')}:{' '}
                <span className="font-medium">
                  {analytics.tokenUsage.totalTokens.toLocaleString()}
                </span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('Total Cost')}:{' '}
                <span className="font-medium">
                  {formatCurrency(analytics.costAnalysis.totalCost)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('Model')}: <span className="font-medium">{modelId}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('Messages')}: <span className="font-medium">{messages.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('summary')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {t('Summary')}
            </button>
            <button
              onClick={() => handleTabChange('timeSeries')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeSeries'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {t('Time Series Analysis')}
            </button>
          </nav>
        </div>

        {/* サマリータブ */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* トークン使用量の詳細 */}
            <div className="p-4 border dark:border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('Token Usage')}</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('Input Tokens')}:{' '}
                  <span className="font-medium">
                    {analytics.tokenUsage.inputTokens.toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('Output Tokens')}:{' '}
                  <span className="font-medium">
                    {analytics.tokenUsage.outputTokens.toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('Cache Read Tokens')}:{' '}
                  <span className="font-medium">
                    {analytics.tokenUsage.cacheReadTokens.toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('Cache Write Tokens')}:{' '}
                  <span className="font-medium">
                    {analytics.tokenUsage.cacheWriteTokens.toLocaleString()}
                  </span>
                </p>
              </div>
              {/* トークン使用量の円グラフ */}
              <div className="h-64">
                {analytics.tokenUsage.totalTokens > 0 ? (
                  <Pie data={tokenChartData} options={pieChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    {t('No token usage data available')}
                  </div>
                )}
              </div>
            </div>

            {/* コスト分析の詳細 */}
            <div className="p-4 border dark:border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('Cost Analysis')}</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('Input Cost')}:{' '}
                  <span className="font-medium">
                    {formatCurrency(analytics.costAnalysis.inputCost)}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('Output Cost')}:{' '}
                  <span className="font-medium">
                    {formatCurrency(analytics.costAnalysis.outputCost)}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('Cache Read Cost')}:{' '}
                  <span className="font-medium">
                    {formatCurrency(analytics.costAnalysis.cacheReadCost)}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('Cache Write Cost')}:{' '}
                  <span className="font-medium">
                    {formatCurrency(analytics.costAnalysis.cacheWriteCost)}
                  </span>
                </p>
                {analytics.costAnalysis.cacheSavings > 0 && (
                  <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                    {t('Saved approximately {{amount}} by using prompt cache', {
                      amount: formatCurrency(analytics.costAnalysis.cacheSavings)
                    })}
                  </p>
                )}
              </div>
              {/* コスト分析の円グラフ */}
              <div className="h-64">
                {analytics.costAnalysis.totalCost > 0 ? (
                  <Pie data={costChartData} options={pieChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    {t('No cost data available')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 時系列分析タブ */}
        {activeTab === 'timeSeries' && (
          <div className="space-y-6">
            {/* 時系列トークン使用量グラフ */}
            <div className="p-4 border dark:border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">
                {t('Token Usage Over Time')}
              </h3>
              <div className="h-80">
                {analytics.timeSeriesData.length > 0 ? (
                  <Line
                    data={tokenTimeSeriesData}
                    options={{
                      ...lineChartOptions,
                      plugins: {
                        ...lineChartOptions.plugins,
                        title: {
                          display: true,
                          text: t('Token Usage Trend')
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    {t('No time series data available')}
                  </div>
                )}
              </div>
            </div>

            {/* 時系列コスト分析グラフ */}
            <div className="p-4 border dark:border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">
                {t('Cost Analysis Over Time')}
              </h3>
              <div className="h-80">
                {analytics.timeSeriesData.length > 0 ? (
                  <Line
                    data={costTimeSeriesData}
                    options={{
                      ...lineChartOptions,
                      plugins: {
                        ...lineChartOptions.plugins,
                        title: {
                          display: true,
                          text: t('Cost Trend')
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    {t('No time series data available')}
                  </div>
                )}
              </div>
            </div>

            {/* 累積トークン使用量とコスト */}
            <div className="p-4 border dark:border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">
                {t('Cumulative Usage')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('Average Tokens per Message')}:
                    <span className="font-medium ml-2">
                      {analytics.timeSeriesData.length > 0
                        ? Math.round(
                            analytics.tokenUsage.totalTokens / analytics.timeSeriesData.length
                          ).toLocaleString()
                        : '0'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('Average Cost per Message')}:
                    <span className="font-medium ml-2">
                      {analytics.timeSeriesData.length > 0
                        ? formatCurrency(
                            analytics.costAnalysis.totalCost / analytics.timeSeriesData.length
                          )
                        : formatCurrency(0)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('Token Usage Efficiency')}:
                    <span className="font-medium ml-2">
                      {analytics.tokenUsage.inputTokens > 0
                        ? `${((analytics.tokenUsage.outputTokens / analytics.tokenUsage.inputTokens) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('Cache Efficiency')}:
                    <span className="font-medium ml-2">
                      {analytics.tokenUsage.inputTokens + analytics.tokenUsage.outputTokens > 0
                        ? `${((analytics.tokenUsage.cacheReadTokens / (analytics.tokenUsage.inputTokens + analytics.tokenUsage.outputTokens)) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </p>
                  {analytics.costAnalysis.cacheSavings > 0 && (
                    <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                      {t('Saved approximately {{amount}} by using prompt cache', {
                        amount: formatCurrency(analytics.costAnalysis.cacheSavings)
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 注意書き */}
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          <p>
            {t(
              'Note: Token usage and cost calculations are estimates based on the available metadata.'
            )}
          </p>
        </div>
      </Modal.Body>
    </Modal>
  )
}

// モーダル表示のカスタムフック
export const useTokenAnalyticsModal = () => {
  const [show, setShow] = useState(false)

  const handleOpen = useCallback(() => {
    setShow(true)
  }, [])

  const handleClose = useCallback(() => {
    setShow(false)
  }, [])

  return {
    show,
    handleOpen,
    handleClose,
    TokenAnalyticsModal
  }
}
