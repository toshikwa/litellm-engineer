import { BedrockAgent } from '@/types/agent'
import { memo, useState } from 'react'
import { EditIcon, RemoveIcon } from '@renderer/components/icons/ToolIcons'
import { useTranslation } from 'react-i18next'

interface BedrockAgentSettingFormProps {
  bedrockAgents: BedrockAgent[]
  setBedrockAgents: (agents: BedrockAgent[]) => void
}

export const BedrockAgentSettingForm = memo(
  ({ bedrockAgents, setBedrockAgents }: BedrockAgentSettingFormProps) => {
    const { t } = useTranslation()
    const [newAgentId, setNewAgentId] = useState('')
    const [newAliasId, setNewAliasId] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [editMode, setEditMode] = useState<string | null>(null)
    const [editData, setEditData] = useState<BedrockAgent>({
      agentId: '',
      aliasId: '',
      description: ''
    })

    const handleAddAgent = () => {
      if (newAgentId.trim() && newAliasId.trim() && newDescription.trim()) {
        setBedrockAgents([
          ...bedrockAgents,
          {
            agentId: newAgentId.trim(),
            aliasId: newAliasId.trim(),
            description: newDescription.trim()
          }
        ])
        setNewAgentId('')
        setNewAliasId('')
        setNewDescription('')
      }
    }

    const handleRemoveAgent = (agentId: string) => {
      setBedrockAgents(bedrockAgents.filter((agent) => agent.agentId !== agentId))
    }

    const handleEditAgent = (agent: BedrockAgent) => {
      setEditMode(agent.agentId)
      setEditData({ ...agent })
    }

    const handleSaveEdit = () => {
      if (editData.agentId.trim() && editData.aliasId.trim() && editData.description.trim()) {
        setBedrockAgents(
          bedrockAgents.map((agent) => (agent.agentId === editMode ? { ...editData } : agent))
        )
        setEditMode(null)
        setEditData({ agentId: '', aliasId: '', description: '' })
      }
    }

    const handleCancelEdit = () => {
      setEditMode(null)
      setEditData({ agentId: '', aliasId: '', description: '' })
    }

    return (
      <div className="mt-4 space-y-4">
        {/* ツールの説明 */}
        <div className="prose dark:prose-invert max-w-none">
          <p className="mb-4 text-gray-700 dark:text-gray-300 font-bold">
            {t(`tool descriptions.invokeBedrockAgent`)}
          </p>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            {t('tool info.invokeBedrockAgent.description')}
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-5">
            <h5 className="font-medium mb-2 dark:text-gray-200">
              {t('tool info.invokeBedrockAgent.about title')}
            </h5>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('tool info.invokeBedrockAgent.about description')}
            </p>
          </div>
        </div>

        {/* Agent 追加フォーム */}
        <div className="flex flex-col gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          <h4 className="font-medium text-sm mb-2 dark:text-gray-200">
            {t('Add New Bedrock Agent')}
          </h4>
          <div className="flex gap-2">
            <div className="flex-grow">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                {t('Agent ID')}
              </label>
              <input
                type="text"
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
                placeholder="e.g., VREKDPSXYP"
                className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
            </div>
            <div className="flex-grow">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                {t('Alias ID')}
              </label>
              <input
                type="text"
                value={newAliasId}
                onChange={(e) => setNewAliasId(e.target.value)}
                placeholder="e.g., ZHSSM0WPXS"
                className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              {t('Description')}
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g., Agent for processing customer inquiries"
              rows={3}
              className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
            />
          </div>
          <button
            onClick={handleAddAgent}
            disabled={!newAgentId.trim() || !newAliasId.trim() || !newDescription.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {t('Add Agent')}
          </button>
        </div>

        {/* 登録済み Agent リスト */}
        <div className="space-y-3 mt-6">
          <h4 className="font-medium text-sm dark:text-gray-200">{t('Registered Agents')}</h4>
          {bedrockAgents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {t('No agents registered yet')}
            </p>
          ) : (
            bedrockAgents.map((agent) => (
              <div
                key={agent.agentId + '_' + agent.aliasId}
                className="flex flex-col p-3 text-sm bg-gray-100 dark:bg-gray-900 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700"
              >
                {editMode === agent.agentId ? (
                  // 編集モード
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {t('Agent ID')}
                        </label>
                        <input
                          type="text"
                          value={editData.agentId}
                          onChange={(e) => setEditData({ ...editData, agentId: e.target.value })}
                          className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {t('Alias ID')}
                        </label>
                        <input
                          type="text"
                          value={editData.aliasId}
                          onChange={(e) => setEditData({ ...editData, aliasId: e.target.value })}
                          className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                        />
                      </div>
                    </div>
                    <div>
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
                        disabled={
                          !editData.agentId.trim() ||
                          !editData.aliasId.trim() ||
                          !editData.description.trim()
                        }
                        className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {t('Save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="grid grid-cols-2 w-full">
                        <span className="font-mono">
                          {t('Agent ID')}: {agent.agentId}
                        </span>
                        <span className="font-mono">
                          {t('Alias ID')}: {agent.aliasId}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAgent(agent)}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title="Edit"
                          aria-label="Edit agent"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleRemoveAgent(agent.agentId)}
                          className="text-red-500 hover:text-red-600 p-1"
                          title="Remove"
                          aria-label="Remove agent"
                        >
                          <RemoveIcon />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">
                      {agent.description}
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
)

BedrockAgentSettingForm.displayName = 'BedrockAgentSettingForm'
