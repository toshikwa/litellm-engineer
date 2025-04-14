import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

interface TavilySearchSettingFormProps {
  tavilySearchApiKey: string
  setTavilySearchApiKey: (apiKey: string) => void
}

export const TavilySearchSettingForm = ({
  tavilySearchApiKey,
  setTavilySearchApiKey
}: TavilySearchSettingFormProps) => {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState(tavilySearchApiKey)
  const [showApiKey, setShowApiKey] = useState(false)

  const handleSave = () => {
    setTavilySearchApiKey(apiKey)
  }

  return (
    <div className="mt-4 space-y-4">
      {/* ツールの説明 */}
      <div className="prose dark:prose-invert max-w-none">
        <p className="mb-4 text-gray-700 dark:text-gray-300 font-bold">
          {t(`tool descriptions.tavilySearch`)}
        </p>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          {t(
            'tool info.tavilySearch.description',
            'Tavily Search enables the AI assistant to search the web for current information, providing better responses to queries about recent events, technical documentation, or other information that may not be in its training data.'
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
        <h4 className="font-medium text-sm mb-2 dark:text-gray-200">
          {t('Tavily Search API Settings')}
        </h4>
        <div className="flex-grow">
          <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">API Key</label>
          <div className="flex items-center gap-2">
            <div className="flex-grow relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="tvly-xxxxxxxxxxxxxxx"
                className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? t('Hide API Key') : t('Show API Key')}
                title={showApiKey ? t('Hide API Key') : t('Show API Key')}
              >
                {showApiKey ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleSave}
              className="min-w-[80px] px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t('Save')}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
            {t('You need a Tavily Search API key to use this feature. Get your API key at')}
            <a
              href="https://tavily.com/"
              target="_blank"
              rel="noreferrer"
              className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
            >
              tavily.com
            </a>
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-5">
        <h5 className="font-medium mb-2 dark:text-gray-200">
          {t('tool info.tavilySearch.about title', 'About Tavily Search API')}
        </h5>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t(
            'tool info.tavilySearch.about description',
            'Tavily provides an AI search API specifically optimized for LLMs, allowing agents to search the web for up-to-date information. The API returns relevant information from across the web that your AI assistant can use to enhance its responses.'
          )}
        </p>
      </div>
    </div>
  )
}
