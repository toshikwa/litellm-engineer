import { KnowledgeBase } from 'src/types/agent-chat'
import { useState } from 'react'
import { EditIcon, RemoveIcon } from '@renderer/components/icons/ToolIcons'
import { useTranslation } from 'react-i18next'

export const KnowledgeBaseSettingForm = ({
  knowledgeBases,
  setKnowledgeBases
}: {
  knowledgeBases: KnowledgeBase[]
  setKnowledgeBases: (knowledgeBase: KnowledgeBase[]) => void
}) => {
  const [newKnowledgeBaseId, setKnowledgeBaseId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const { t } = useTranslation()
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editData, setEditData] = useState<KnowledgeBase>({ knowledgeBaseId: '', description: '' })

  const handleAddKB = () => {
    if (newKnowledgeBaseId.trim() && newDescription.trim()) {
      setKnowledgeBases([
        ...knowledgeBases,
        {
          knowledgeBaseId: newKnowledgeBaseId.trim(),
          description: newDescription.trim()
        }
      ])
      setKnowledgeBaseId('')
      setNewDescription('')
    }
  }

  const handleRemoveKB = (knowledgeBaseId: string) => {
    setKnowledgeBases(knowledgeBases.filter((kb) => kb.knowledgeBaseId !== knowledgeBaseId))
  }

  const handleEditKB = (kb: KnowledgeBase) => {
    setEditMode(kb.knowledgeBaseId)
    setEditData({ ...kb })
  }

  const handleSaveEdit = () => {
    if (editData.knowledgeBaseId.trim() && editData.description.trim()) {
      setKnowledgeBases(
        knowledgeBases.map((kb) => (kb.knowledgeBaseId === editMode ? { ...editData } : kb))
      )
      setEditMode(null)
      setEditData({ knowledgeBaseId: '', description: '' })
    }
  }

  const handleCancelEdit = () => {
    setEditMode(null)
    setEditData({ knowledgeBaseId: '', description: '' })
  }

  return (
    <div className="mt-4 space-y-4">
      {/* ツールの説明 */}
      <div className="prose dark:prose-invert max-w-none">
        <p className="mb-4 text-gray-700 dark:text-gray-300 font-bold">
          {t(`tool descriptions.retrieve`)}
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300">
          {t('tool info.retrieve.description')}
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-5">
          <h5 className="font-medium mb-2 dark:text-gray-200">
            {t('tool info.retrieve.about title')}
          </h5>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t('tool info.retrieve.about description')}
          </p>
        </div>
      </div>

      {/* KnowledgeBase 追加フォーム */}
      <div className="flex flex-col gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
        <h4 className="font-medium text-sm mb-2 dark:text-gray-200">
          {t('Add New Knowledge Base')}
        </h4>
        <div className="flex-grow">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Knowledge Base ID')}
          </label>
          <input
            type="text"
            value={newKnowledgeBaseId}
            onChange={(e) => setKnowledgeBaseId(e.target.value)}
            placeholder="e.g., BM7GYFCKIA"
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          />
        </div>
        <div className="flex-grow">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Description')}
          </label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="e.g., Stores in-house manuals and past inquiry history"
            rows={3}
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
          />
        </div>

        <button
          onClick={handleAddKB}
          disabled={!newKnowledgeBaseId.trim() || !newDescription.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {t('Add Knowledge Base')}
        </button>
      </div>

      {/* 登録済み KnowledgeBase リスト */}
      <div className="space-y-3 mt-6">
        <h4 className="font-medium text-sm dark:text-gray-200">
          {t('Registered Knowledge Bases')}
        </h4>
        {knowledgeBases.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            {t('No knowledge bases registered yet')}
          </p>
        ) : (
          knowledgeBases.map((kb) => (
            <div
              key={kb.knowledgeBaseId}
              className="flex flex-col p-3 text-sm bg-gray-100 dark:bg-gray-900 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700"
            >
              {editMode === kb.knowledgeBaseId ? (
                // 編集モード
                <div className="flex flex-col gap-2">
                  <div className="flex-grow">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {t('Knowledge Base ID')}
                    </label>
                    <input
                      type="text"
                      value={editData.knowledgeBaseId}
                      onChange={(e) =>
                        setEditData({ ...editData, knowledgeBaseId: e.target.value })
                      }
                      className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex-grow">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {t('Description')}
                    </label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                      className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {t('Cancel')}
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editData.knowledgeBaseId.trim() || !editData.description.trim()}
                      className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {t('Save')}
                    </button>
                  </div>
                </div>
              ) : (
                // 表示モード
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-mono">
                      {t('Knowledge Base ID')}: {kb.knowledgeBaseId}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditKB(kb)}
                        className="text-blue-500 hover:text-blue-600 p-1"
                        title="Edit"
                        aria-label="Edit knowledge base"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleRemoveKB(kb.knowledgeBaseId)}
                        className="text-red-500 hover:text-red-600 p-1"
                        title="Remove"
                        aria-label="Remove knowledge base"
                      >
                        <RemoveIcon />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">
                    {kb.description}
                  </p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
