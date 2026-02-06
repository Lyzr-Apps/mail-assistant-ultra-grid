// TypeScript interfaces based on actual agent response structures

export interface Task {
  title: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  assignee: string
  context: string
  source_email: string
}

export interface TaskStructurerResponse {
  status: 'success' | 'error'
  result: {
    tasks: Task[]
  }
  metadata: {
    agent_name: string
    timestamp: string
  }
}

export interface SlackNotification {
  assignee: string
  slack_handle: string
  message_sent: string
  status: 'sent' | 'failed'
  timestamp: string
}

export interface SlackNotifierResponse {
  status: 'success' | 'error'
  result: {
    notifications: SlackNotification[]
  }
  metadata: {
    agent_name: string
    timestamp: string
  }
}

export interface DelegatedTask extends Task {
  id: string
  notification?: SlackNotification
  delegatedAt: string
}

export interface TeammateMapping {
  name: string
  slackHandle: string
}

export interface DelegationSettings {
  keywords: string[]
  teammateMapping: TeammateMapping[]
}

export interface DelegationHistory {
  id: string
  date: string
  tasks: DelegatedTask[]
}
