import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { SettingSection } from '../SettingSection'

type LiteLLMSectionProps = {
  liteLLMApiKey: string
  liteLLMBaseURL: string
  onUpdateLiteLLMApiKey: (apiKey: string) => void
  onUpdateLiteLLMBaseURL: (baseURL: string) => void
}

export const LiteLLMSection: React.FC<LiteLLMSectionProps> = ({
  liteLLMApiKey,
  liteLLMBaseURL,
  onUpdateLiteLLMApiKey,
  onUpdateLiteLLMBaseURL
}) => {
  const { t } = useTranslation()
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <SettingSection title={t('LiteLLM Settings')}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t(
            'Configure LiteLLM connection settings. All models will be available in the model selection dropdown.'
          )}
        </p>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="litellm-base-url"
            className="text-sm font-medium text-gray-900 dark:text-gray-300"
          >
            Base URL
          </label>
          <input
            type="text"
            id="litellm-base-url"
            value={liteLLMBaseURL}
            onChange={(e) => onUpdateLiteLLMBaseURL(e.target.value)}
            placeholder="https://api.litellm.ai/v1"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="litellm-api-key"
            className="text-sm font-medium text-gray-900 dark:text-gray-300"
          >
            API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              id="litellm-api-key"
              value={liteLLMApiKey}
              onChange={(e) => onUpdateLiteLLMApiKey(e.target.value)}
              placeholder="sk-..."
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <FiEyeOff className="text-gray-500 dark:text-gray-400" />
              ) : (
                <FiEye className="text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </SettingSection>
  )
}
