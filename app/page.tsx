'use client'

import { useState, useEffect } from 'react'
import { FaGmail, FaSlack, FaCheckCircle, FaTimesCircle, FaSpinner, FaCog, FaTimes, FaPlus, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <FaCog className="mr-2" />
                Settings
              </Button>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {settings.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="px-3 py-1">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-3">
                  Monitoring emails for these keywords to identify delegation tasks
                </p>
              </CardContent>
            </Card>

            {/* Process Button */}
            <div className="flex justify-center">
              <Button
                onClick={processDelegations}
                disabled={isProcessing}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold"
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className="mr-2 animate-spin" />
                    Processing Delegations...
                  </>
                ) : (
                  'Process Delegations'
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <FaTimesCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Results Area */}
            {currentTasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Delegated Tasks</h2>
                {currentTasks.map((task) => (
                  <Card key={task.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {/* Task Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-slate-800">{task.title}</h3>
                            <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskExpanded(task.id)}
                          >
                            {expandedTasks.has(task.id) ? <FaChevronUp /> : <FaChevronDown />}
                          </Button>
                        </div>

                        {/* Task Meta */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                            {task.priority.toUpperCase()}
                          </Badge>
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* History Sidebar - 30% width */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Delegation History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
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
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Keyword Configuration */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Keyword Configuration</Label>
              <p className="text-sm text-slate-500">
                Add keywords to monitor for delegation triggers in emails
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                />
                <Button onClick={addKeyword} size="sm">
                  <FaPlus className="mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="px-3 py-2 text-sm">
                    {keyword}
                    <button
                      onClick={() => removeKeyword(keyword)}
                      className="ml-2 hover:text-red-600"
                    >
                      <FaTimes size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Teammate Mapping */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Teammate Mapping</Label>
              <p className="text-sm text-slate-500">
                Map email mentions to Slack handles for notifications
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Name (e.g., John)"
                  value={newTeammate.name}
                  onChange={(e) =>
                    setNewTeammate((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  placeholder="Slack handle (e.g., @john.smith)"
                  value={newTeammate.slackHandle}
                  onChange={(e) =>
                    setNewTeammate((prev) => ({ ...prev, slackHandle: e.target.value }))
                  }
                />
              </div>
              <Button onClick={addTeammate} size="sm" className="w-full">
                <FaPlus className="mr-2" />
                Add Teammate
              </Button>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
