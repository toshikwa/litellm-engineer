import React, { useState, useRef, useEffect } from 'react'
import {
  PromptCachingType,
  LITELLM_SUPPORTED_CACHING_TYPES,
  LITELLM_CACHING_TYPE_DESCRIPTIONS
} from '@/types/litellm'
import { useTranslation } from 'react-i18next'
import { FiChevronDown, FiDatabase } from 'react-icons/fi'
import { useSettings } from '@renderer/contexts/SettingsContext'

type PromptCachingTypeSelectorProps = {
  className?: string
}

export const PromptCachingTypeSelector: React.FC<PromptCachingTypeSelectorProps> = ({
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { liteLLMConfig, updateLiteLLMCachingType } = useSettings()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  const getCachingType = (): PromptCachingType => {
    return liteLLMConfig.cachingType
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const options = LITELLM_SUPPORTED_CACHING_TYPES.map((type) => ({
    // Fallback to uppercase if translation not found
    label: t(`promptCaching.${type}`, { defaultValue: type[0].toUpperCase() + type.slice(1) }),
    value: type
  }))

  const getSelectedLabel = () => {
    const selected = options.find((option) => option.value === getCachingType())
    return selected ? selected.label : options[0].label
  }

  return (
    <div className={`relative ${className || ''}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 rounded-md transition-colors"
        title={t('promptCaching.title')}
      >
        <FiDatabase className="size-4 text-blue-600 dark:text-blue-400" />
        <span className="whitespace-nowrap">{getSelectedLabel()}</span>
        <FiChevronDown className="text-gray-400 dark:text-gray-500" size={16} />
      </button>

      {isOpen && (
        <div
          className="absolute z-20 w-72 bottom-full mb-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg
          border border-gray-200 dark:border-gray-700 py-1"
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                updateLiteLLMCachingType(option.value)
                setIsOpen(false)
              }}
              className={`
                flex items-center gap-3 px-3 py-2 cursor-pointer
                ${getCachingType() === option.value ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}
                hover:bg-gray-50 dark:hover:bg-gray-800
                transition-colors
              `}
            >
              <span className="text-sm whitespace-nowrap dark:text-gray-100">
                {option.label} ({LITELLM_CACHING_TYPE_DESCRIPTIONS[option.value]})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
