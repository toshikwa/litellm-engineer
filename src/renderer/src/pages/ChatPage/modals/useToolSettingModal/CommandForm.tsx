/* eslint-disable react/no-unescaped-entities */
import { memo, useState } from 'react'
import { CommandConfig, AVAILABLE_SHELLS } from '.'
import { EditIcon, RemoveIcon } from '@renderer/components/icons/ToolIcons'
import { useTranslation } from 'react-i18next'

// コマンド設定フォームコンポーネント
export const CommandForm = memo(
  ({
    allowedCommands,
    setAllowedCommands,
    shell,
    setShell
  }: {
    allowedCommands: CommandConfig[]
    setAllowedCommands: (commands: CommandConfig[]) => void
    shell: string
    setShell: (shell: string) => void
  }) => {
    const { t } = useTranslation()
    const [newCommand, setNewCommand] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [editMode, setEditMode] = useState<string | null>(null)
    const [editData, setEditData] = useState<CommandConfig>({ pattern: '', description: '' })

    const handleAddCommand = () => {
      if (newCommand.trim() && newDescription.trim()) {
        setAllowedCommands([
          ...allowedCommands,
          {
            pattern: newCommand.trim(),
            description: newDescription.trim()
          }
        ])
        setNewCommand('')
        setNewDescription('')
      }
    }

    const handleRemoveCommand = (pattern: string) => {
      setAllowedCommands(allowedCommands.filter((cmd) => cmd.pattern !== pattern))
    }

    const handleEditCommand = (command: CommandConfig) => {
      setEditMode(command.pattern)
      setEditData({ ...command })
    }

    const handleSaveEdit = () => {
      if (editData.pattern.trim() && editData.description.trim()) {
        setAllowedCommands(
          allowedCommands.map((cmd) => (cmd.pattern === editMode ? { ...editData } : cmd))
        )
        setEditMode(null)
        setEditData({ pattern: '', description: '' })
      }
    }

    const handleCancelEdit = () => {
      setEditMode(null)
      setEditData({ pattern: '', description: '' })
    }

    return (
      <div className="mt-4 space-y-4">
        {/* ツールの説明 */}
        <div className="prose dark:prose-invert max-w-none">
          <p className="mb-4 text-gray-700 dark:text-gray-300 font-bold">
            {t(`tool descriptions.executeCommand`)}
          </p>

          <p className="mb-4 text-gray-700 dark:text-gray-300">
            {t('tool info.executeCommand.description')}
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md mb-5">
            <h5 className="font-medium mb-2 text-yellow-800 dark:text-yellow-300">
              {t('tool info.executeCommand.warning title')}
            </h5>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('tool info.executeCommand.warning description')}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-5">
            <h5 className="font-medium mb-2 dark:text-gray-200">
              {t('tool info.executeCommand.example title')}
            </h5>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('tool info.executeCommand.example description')}
            </p>
          </div>
        </div>

        {/* シェル選択 */}
        <div className="space-y-2 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          <h4 className="font-medium text-sm mb-3 dark:text-gray-200">
            {t('Command Shell Settings')}
          </h4>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Command Shell')}
          </label>
          <select
            value={shell}
            onChange={(e) => setShell(e.target.value)}
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          >
            {AVAILABLE_SHELLS.map((shellOption) => (
              <option key={shellOption.value} value={shellOption.value}>
                {shellOption.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('Select which shell to use when executing commands')}
          </p>
        </div>

        {/* コマンド追加フォーム */}
        <div className="flex flex-col gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-md mt-4">
          <h4 className="font-medium text-sm mb-2 dark:text-gray-200">
            {t('Add New Command Pattern')}
          </h4>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              {t('Command Pattern')}
            </label>
            <input
              type="text"
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              placeholder="e.g., ls *"
              className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('Use * as a wildcard (e.g., "npm *" allows all npm commands)')}
            </p>
          </div>
          <div className="mt-2">
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              {t('Description')}
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g., List directory contents"
              rows={3}
              className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
            />
          </div>
          <button
            onClick={handleAddCommand}
            disabled={!newCommand.trim() || !newDescription.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed mt-2"
          >
            {t('Add Command')}
          </button>
        </div>

        {/* 登録済みコマンドリスト */}
        <div className="space-y-3 mt-6">
          <h4 className="font-medium text-sm dark:text-gray-200">
            {t('Allowed Command Patterns')}
          </h4>
          <div className=" grid grid-cols-2 gap-2">
            {allowedCommands.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {t('No command patterns registered yet')}
              </p>
            ) : (
              allowedCommands.map((command) => (
                <div
                  key={command.pattern}
                  className="flex flex-col p-3 text-sm bg-gray-100 dark:bg-gray-900 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700"
                >
                  {editMode === command.pattern ? (
                    // 編集モード
                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {t('Command Pattern')}
                        </label>
                        <input
                          type="text"
                          value={editData.pattern}
                          onChange={(e) => setEditData({ ...editData, pattern: e.target.value })}
                          className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                        />
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {t('Description')}
                        </label>
                        <textarea
                          value={editData.description}
                          onChange={(e) =>
                            setEditData({ ...editData, description: e.target.value })
                          }
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
                          disabled={!editData.pattern.trim() || !editData.description.trim()}
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
                        <span className="font-mono font-medium">{command.pattern}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCommand(command)}
                            className="text-blue-500 hover:text-blue-600 p-1"
                            title="Edit"
                            aria-label="Edit command"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleRemoveCommand(command.pattern)}
                            className="text-red-500 hover:text-red-600 p-1"
                            title="Remove"
                            aria-label="Remove command"
                          >
                            <RemoveIcon />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">
                        {command.description}
                      </p>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }
)
CommandForm.displayName = 'CommandForm'
