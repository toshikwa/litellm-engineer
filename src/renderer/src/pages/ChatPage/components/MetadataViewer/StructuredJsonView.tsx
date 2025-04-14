import React, { useState, useEffect } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'

interface JsonViewerProps {
  data: any
  level?: number
  expandAll?: boolean
}

export const StructuredJsonView: React.FC<JsonViewerProps> = ({
  data,
  level = 0,
  expandAll = false
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    expandAll ? Object.keys(data || {}).reduce((acc, key) => ({ ...acc, [key]: true }), {}) : {}
  )

  // expandAll プロパティが変更されたときに展開状態を更新
  useEffect(() => {
    setExpanded(
      expandAll ? Object.keys(data || {}).reduce((acc, key) => ({ ...acc, [key]: true }), {}) : {}
    )
  }, [expandAll, data])

  if (data === null || data === undefined) {
    return <span className="text-gray-500 dark:text-gray-300">null</span>
  }

  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      return <span className="text-green-600">&quot;{data}&quot;</span>
    } else if (typeof data === 'number') {
      return <span className="text-blue-600">{data}</span>
    } else if (typeof data === 'boolean') {
      return <span className="text-purple-600">{data.toString()}</span>
    }
    return <span>{String(data)}</span>
  }

  const isArray = Array.isArray(data)
  const isEmpty = Object.keys(data).length === 0

  if (isEmpty) {
    return <span>{isArray ? '[ ]' : '{ }'}</span>
  }

  // インデントのためのスタイル
  const paddingLeft = `${level * 16}px`

  return (
    <div className="w-full font-mono">
      {Object.entries(data).map(([key, value]) => {
        const isExpandable =
          typeof value === 'object' && value !== null && Object.keys(value).length > 0
        const isItemExpanded = expanded[key] || false

        return (
          <div key={key} className="w-full" style={{ paddingLeft }}>
            <div className="flex items-start">
              {isExpandable ? (
                <button
                  onClick={() => setExpanded({ ...expanded, [key]: !isItemExpanded })}
                  className="mr-1 mt-1 focus:outline-none text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
                >
                  {isItemExpanded ? (
                    <FiChevronDown className="w-3 h-3" />
                  ) : (
                    <FiChevronRight className="w-3 h-3" />
                  )}
                </button>
              ) : (
                <span className="mr-1 w-3">&nbsp;</span>
              )}

              <div className="flex-grow">
                <div className="flex items-start">
                  <span className="text-blue-700 dark:text-blue-400 mr-2">
                    {isArray ? `${key}:` : `"${key}":`}
                  </span>

                  {isExpandable ? (
                    <span className="text-gray-600 dark:text-gray-300">
                      {isItemExpanded
                        ? isArray
                          ? '['
                          : '{'
                        : isArray
                          ? `[...] (${Object.keys(value).length} items)`
                          : `{...} (${Object.keys(value).length} properties)`}
                    </span>
                  ) : (
                    <StructuredJsonView data={value} level={level + 1} />
                  )}
                </div>

                {isExpandable && isItemExpanded && (
                  <div className="pl-4">
                    <StructuredJsonView data={value} level={level + 1} />
                  </div>
                )}

                {isExpandable && isItemExpanded && (
                  <div style={{ paddingLeft: '0px' }}>
                    <span className="text-gray-600 dark:text-gray-300">{isArray ? ']' : '}'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
