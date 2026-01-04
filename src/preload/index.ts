import './models'
import './usage'
import './embeddings'
import './browser-window'
import './tools'
import './files'

import { PromptOptions } from '@shared/chats'
import { type ChatMessage } from '@shared/message-list/base'
import { contextBridge, ipcRenderer } from 'electron'

// System/Hardware API
export interface HardwareInfo {
  totalMemoryGB: number
  availableMemoryGB: number
  cpuModel: string
  cpuCores: number
  isAppleSilicon: boolean
  generation?: string
  variant?: string
  gpuCores?: number
}

export interface SystemAPI {
  getHardwareInfo: () => Promise<HardwareInfo>
}

contextBridge.exposeInMainWorld('system', {
  getHardwareInfo: () => ipcRenderer.invoke('system:getHardwareInfo'),
} satisfies SystemAPI)

// Hooks API for continuous improvement
export interface HooksAPI {
  getMetrics: () => Promise<Record<string, unknown>>
  getSuggestions: () => Promise<{
    id: string
    type: string
    priority: string
    title: string
    description: string
  }[]>
  dismissSuggestion: (id: string) => Promise<void>
  trigger: (event: string, data?: Record<string, unknown>) => Promise<void>
}

contextBridge.exposeInMainWorld('hooks', {
  getMetrics: () => ipcRenderer.invoke('hooks:getMetrics'),
  getSuggestions: () => ipcRenderer.invoke('hooks:getSuggestions'),
  dismissSuggestion: (id: string) => ipcRenderer.invoke('hooks:dismissSuggestion', id),
  trigger: (event: string, data?: Record<string, unknown>) =>
    ipcRenderer.invoke('hooks:trigger', event, data || {}),
} satisfies HooksAPI)

contextBridge.exposeInMainWorld('chats', {
  sendMessage: (message) => {
    return ipcRenderer.invoke('chats:sendMessage', message)
  },
  regenerateMessage: (message) => {
    return ipcRenderer.invoke('chats:regenerateMessage', message)
  },
  abort: (threadID) => {
    return ipcRenderer.invoke('chats:abort', threadID)
  },
  onToken: (callback) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      { token, messageID }: { token: string; messageID: string },
    ) => {
      callback(token, messageID)
    }

    ipcRenderer.on('token', handler)

    return () => {
      ipcRenderer.off('token', handler)
    }
  },
  loadMessageList: ({ modelPath, threadID, messages }) => {
    return ipcRenderer.invoke('chats:loadMessageList', {
      modelPath,
      threadID,
      messages,
    })
  },

  cleanupSession: ({ modelPath, threadID }) => {
    return ipcRenderer.invoke('chats:cleanupSession', {
      modelPath,
      threadID,
    })
  },
} satisfies ChatsAPI)

export interface ChatsAPI {
  sendMessage: (args: {
    systemPrompt: string
    message: string
    messageID: string
    assistantMessageID: string
    threadID: string
    promptOptions?: PromptOptions
    modelPath: string
    selectedFile?: string
    outOfBand?: boolean
  }) => Promise<string>

  regenerateMessage: (args: {
    systemPrompt: string
    messageID: string
    threadID: string
    promptOptions?: PromptOptions
    modelPath: string
    selectedFile?: string
  }) => Promise<string>

  abort: (threadID: string) => void

  cleanupSession: ({
    modelPath,
    threadID,
  }: {
    modelPath: string
    threadID: string
  }) => Promise<void>

  onToken: (callback: (token: string, messageID: string) => void) => () => void

  loadMessageList: ({
    modelPath,
    threadID,
    messages,
  }: {
    modelPath: string
    threadID: string
    messages: ChatMessage[]
  }) => Promise<void>
}

declare global {
  interface Window {
    chats: ChatsAPI
    system: SystemAPI
    hooks: HooksAPI
  }
}
