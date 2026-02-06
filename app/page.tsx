'use client'

import { useState, useEffect } from 'react'
import { FaGmail, FaSlack, FaCheckCircle, FaTimesCircle, FaSpinner, FaCog, FaTimes, FaPlus, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import type { DelegatedTask, DelegationHistory, DelegationSettings, TeammateMapping } from '@/types/delegation'

export default function Home() {
  // State management
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTasks, setCurrentTasks] = useState<DelegatedTask[]>([])
  const [history, setHistory] = useState<DelegationHistory[]>([])
  const [settings, setSettings] = useState<DelegationSettings>({
    keywords: ['@', 'assign', 'delegate', 'task', 'urgent'],
    teammateMapping: [
      { name: 'John', slackHandle: '@john.smith' },
      { name: 'Sarah', slackHandle: '@sarah.jones' },
    ],
  })
  const [showSettings, setShowSettings] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [newKeyword, setNewKeyword] = useState('')
  const [newTeammate, setNewTeammate] = useState({ name: '', slackHandle: '' })
  const [error, setError] = useState<string | null>(null)
  const [gmailConnected] = useState(true) // Simulated - agents handle OAuth
  const [slackConnected] = useState(true) // Simulated - agents handle OAuth

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('delegationHistory')
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
    }
    const savedSettings = localStorage.getItem('delegationSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  // Save history to localStorage when it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('delegationHistory', JSON.stringify(history))
    }
  }, [history])

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('delegationSettings', JSON.stringify(settings))
  }, [settings])

  const processDelegations = async () => {
    setIsProcessing(true)
    setError(null)
    setCurrentTasks([])

    try {
      // Call the Manager Agent (Task Delegation Coordinator)
      const message = `Process delegations from recent emails. Keywords: ${settings.keywords.join(', ')}`

      const response = await fetch('/api/process-delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          user_id: 'dashboard_user',
          session_id: `delegation_${Date.now()}`,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to process delegations')
      }

      // Parse the response based on actual structure
      let tasks: DelegatedTask[] = []

      // Check if response contains tasks (from Task Structurer Agent)
      if (data.response?.result?.tasks && Array.isArray(data.response.result.tasks)) {
        tasks = data.response.result.tasks.map((task: any, index: number) => ({
          ...task,
          id: `task_${Date.now()}_${index}`,
          delegatedAt: new Date().toISOString(),
          notification: undefined, // Will be populated by Slack Notifier
        }))
      } else if (data.response?.result?.notifications) {
        // If we received notifications instead, create tasks from them
        tasks = data.response.result.notifications.map((notif: any, index: number) => ({
          id: `task_${Date.now()}_${index}`,
          title: 'Task Notification',
          description: notif.message_sent?.split('\n')[0] || 'No description',
          priority: 'medium' as const,
          assignee: notif.assignee,
          context: notif.message_sent || '',
          source_email: 'Email',
          delegatedAt: notif.timestamp,
          notification: notif,
        }))
      } else {
        // Handle text-only response
        const message = data.response?.result?.message || data.raw_response || 'No tasks found'
        throw new Error(message)
      }

      setCurrentTasks(tasks)

      // Add to history
      if (tasks.length > 0) {
        const newHistoryEntry: DelegationHistory = {
          id: `history_${Date.now()}`,
          date: new Date().toISOString(),
          tasks,
        }
        setHistory((prev) => [newHistoryEntry, ...prev.slice(0, 9)]) // Keep last 10
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 hover:bg-red-600'
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600'
      case 'medium':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'low':
        return 'bg-gray-500 hover:bg-gray-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !settings.keywords.includes(newKeyword.trim())) {
      setSettings((prev) => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()],
      }))
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setSettings((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }))
  }

  const addTeammate = () => {
    if (newTeammate.name.trim() && newTeammate.slackHandle.trim()) {
      setSettings((prev) => ({
        ...prev,
        teammateMapping: [...prev.teammateMapping, { ...newTeammate }],
      }))
      setNewTeammate({ name: '', slackHandle: '' })
    }
  }

  const removeTeammate = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      teammateMapping: prev.teammateMapping.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">Task Delegation Dashboard</h1>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FaGmail className={gmailConnected ? 'text-red-500' : 'text-gray-400'} size={20} />
                  {gmailConnected ? (
                    <FaCheckCircle className="text-green-500" size={16} />
                  ) : (
                    <FaTimesCircle className="text-gray-400" size={16} />
                  )}
                  <span className="text-sm text-slate-600">Gmail</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaSlack className={slackConnected ? 'text-purple-600' : 'text-gray-400'} size={20} />
                  {slackConnected ? (
                    <FaCheckCircle className="text-green-500" size={16} />
                  ) : (
                    <FaTimesCircle className="text-gray-400" size={16} />
                  )}
                  <span className="text-sm text-slate-600">Slack</span>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FaCog />
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Processing Panel - 70% width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Keywords Display */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800">Active Keywords</h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {settings.keywords.map((keyword) => (
                    <span key={keyword} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">
                      {keyword}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-3">
                  Monitoring emails for these keywords to identify delegation tasks
                </p>
              </div>
            </div>

            {/* Process Button */}
            <div className="flex justify-center">
              <button
                onClick={processDelegations}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-md"
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Processing Delegations...
                  </>
                ) : (
                  'Process Delegations'
                )}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <FaTimesCircle className="text-red-500 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Results Area */}
            {currentTasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Delegated Tasks</h2>
                {currentTasks.map((task) => (
                  <div key={task.id} className="bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-lg shadow-sm">
                    <div className="p-6">
                      <div className="space-y-3">
                        {/* Task Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-slate-800">{task.title}</h3>
                            <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                          </div>
                          <button
                            onClick={() => toggleTaskExpanded(task.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {expandedTasks.has(task.id) ? <FaChevronUp className="text-slate-600" /> : <FaChevronDown className="text-slate-600" />}
                          </button>
                        </div>

                        {/* Task Meta */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className={`${getPriorityColor(task.priority)} text-white px-3 py-1 rounded-md text-xs font-semibold`}>
                            {task.priority.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">
                              {task.assignee.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{task.assignee}</span>
                          </div>
                          {task.notification && (
                            <div className="flex items-center gap-2">
                              {task.notification.status === 'sent' ? (
                                <>
                                  <FaCheckCircle className="text-green-500" />
                                  <span className="text-sm text-green-600 font-medium">Sent to Slack</span>
                                </>
                              ) : (
                                <>
                                  <FaTimesCircle className="text-red-500" />
                                  <span className="text-sm text-red-600 font-medium">Failed to send</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded Content */}
                        {expandedTasks.has(task.id) && (
                          <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-2">
                            <div>
                              <span className="text-sm font-semibold text-slate-700">Context:</span>
                              <p className="text-sm text-slate-600 mt-1">{task.context}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-slate-700">Source:</span>
                              <p className="text-sm text-slate-600 mt-1">{task.source_email}</p>
                            </div>
                            {task.notification && (
                              <div>
                                <span className="text-sm font-semibold text-slate-700">Slack Message:</span>
                                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
                                  {task.notification.message_sent}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History Sidebar - 30% width */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm sticky top-4">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800">Delegation History</h3>
              </div>
              <div className="px-6 py-4">
                <div className="h-[600px] overflow-y-auto pr-2">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No delegation history yet</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setCurrentTasks(entry.tasks)}
                        >
                          <div className="text-xs text-slate-500 mb-2">
                            {new Date(entry.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="space-y-2">
                            {entry.tasks.slice(0, 2).map((task) => (
                              <div key={task.id} className="text-sm">
                                <div className="font-medium text-slate-700 truncate">{task.title}</div>
                                <div className="text-xs text-slate-500">
                                  Assigned to {task.assignee}
                                </div>
                              </div>
                            ))}
                            {entry.tasks.length > 2 && (
                              <div className="text-xs text-slate-500">
                                +{entry.tasks.length - 2} more task{entry.tasks.length - 2 !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-slate-800">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-slate-600" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Keyword Configuration */}
              <div className="space-y-3">
                <label className="text-base font-semibold text-slate-800 block">Keyword Configuration</label>
                <p className="text-sm text-slate-500">
                  Add keywords to monitor for delegation triggers in emails
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addKeyword}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaPlus />
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.keywords.map((keyword) => (
                    <span key={keyword} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="hover:text-red-600"
                      >
                        <FaTimes size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Teammate Mapping */}
              <div className="space-y-3">
                <label className="text-base font-semibold text-slate-800 block">Teammate Mapping</label>
                <p className="text-sm text-slate-500">
                  Map email mentions to Slack handles for notifications
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g., John)"
                    value={newTeammate.name}
                    onChange={(e) =>
                      setNewTeammate((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Slack handle (e.g., @john.smith)"
                    value={newTeammate.slackHandle}
                    onChange={(e) =>
                      setNewTeammate((prev) => ({ ...prev, slackHandle: e.target.value }))
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={addTeammate}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus />
                  Add Teammate
                </button>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-sm font-semibold text-slate-700">Name</th>
                      <th className="text-left px-4 py-2 text-sm font-semibold text-slate-700">Slack Handle</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.teammateMapping.map((teammate, index) => (
                      <tr key={index} className="border-t border-slate-200">
                        <td className="px-4 py-2 text-sm text-slate-700">{teammate.name}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{teammate.slackHandle}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removeTeammate(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end sticky bottom-0 bg-white">
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
