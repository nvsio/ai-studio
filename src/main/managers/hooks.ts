/**
 * Hooks System for Continuous Improvement
 *
 * This system tracks usage patterns, performance metrics, and provides
 * suggestions for optimizing the user experience based on their goals.
 *
 * Privacy-first: All data stays local.
 */

import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface UsageMetrics {
  // Session metrics
  totalSessions: number
  totalMessages: number
  avgResponseTime: number

  // Model usage
  modelUsage: Record<string, {
    count: number
    avgTokens: number
    avgLatency: number
    lastUsed: number
  }>

  // Feature usage
  featureUsage: {
    pdfChat: number
    imageChat: number
    codeGeneration: number
    toolCalling: number
  }

  // Performance
  peakMemoryUsage: number
  avgGpuUtilization: number

  // User preferences inferred
  preferredContextSize: number
  preferredTemperature: number

  // Timestamps
  firstUse: number
  lastUse: number
}

export interface ImprovementSuggestion {
  id: string
  type: 'model' | 'settings' | 'feature' | 'performance'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: () => void
  dismissedAt?: number
}

export type HookEvent =
  | 'session:start'
  | 'session:end'
  | 'message:sent'
  | 'message:received'
  | 'model:loaded'
  | 'model:unloaded'
  | 'feature:used'
  | 'error:occurred'
  | 'performance:sample'

export type HookCallback = (event: HookEvent, data: Record<string, unknown>) => void

class HooksManager {
  private metrics: UsageMetrics
  private suggestions: ImprovementSuggestion[] = []
  private hooks: Map<HookEvent, HookCallback[]> = new Map()
  private metricsPath: string
  private saveTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.metricsPath = join(app.getPath('userData'), 'usage-metrics.json')
    this.metrics = this.loadMetrics()

    // Register default hooks
    this.registerDefaultHooks()
  }

  private loadMetrics(): UsageMetrics {
    const defaultMetrics: UsageMetrics = {
      totalSessions: 0,
      totalMessages: 0,
      avgResponseTime: 0,
      modelUsage: {},
      featureUsage: {
        pdfChat: 0,
        imageChat: 0,
        codeGeneration: 0,
        toolCalling: 0,
      },
      peakMemoryUsage: 0,
      avgGpuUtilization: 0,
      preferredContextSize: 8192,
      preferredTemperature: 0.7,
      firstUse: Date.now(),
      lastUse: Date.now(),
    }

    try {
      if (existsSync(this.metricsPath)) {
        const data = readFileSync(this.metricsPath, 'utf-8')
        return { ...defaultMetrics, ...JSON.parse(data) }
      }
    } catch (error) {
      console.warn('[Hooks] Failed to load metrics:', error)
    }

    return defaultMetrics
  }

  private saveMetrics(): void {
    // Debounce saves
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      try {
        writeFileSync(this.metricsPath, JSON.stringify(this.metrics, null, 2))
      } catch (error) {
        console.warn('[Hooks] Failed to save metrics:', error)
      }
    }, 1000)
  }

  private registerDefaultHooks(): void {
    // Track sessions
    this.on('session:start', () => {
      this.metrics.totalSessions++
      this.metrics.lastUse = Date.now()
      this.saveMetrics()
    })

    // Track messages
    this.on('message:received', (_, data) => {
      this.metrics.totalMessages++

      if (data.responseTime) {
        // Rolling average
        const prevTotal = this.metrics.avgResponseTime * (this.metrics.totalMessages - 1)
        this.metrics.avgResponseTime = (prevTotal + (data.responseTime as number)) / this.metrics.totalMessages
      }

      this.saveMetrics()
    })

    // Track model usage
    this.on('model:loaded', (_, data) => {
      const modelName = data.modelName as string
      if (!this.metrics.modelUsage[modelName]) {
        this.metrics.modelUsage[modelName] = {
          count: 0,
          avgTokens: 0,
          avgLatency: 0,
          lastUsed: Date.now(),
        }
      }
      this.metrics.modelUsage[modelName].count++
      this.metrics.modelUsage[modelName].lastUsed = Date.now()
      this.saveMetrics()
    })

    // Track features
    this.on('feature:used', (_, data) => {
      const feature = data.feature as keyof typeof this.metrics.featureUsage
      if (feature in this.metrics.featureUsage) {
        this.metrics.featureUsage[feature]++
        this.saveMetrics()
      }
    })

    // Track performance
    this.on('performance:sample', (_, data) => {
      if (data.memoryUsage && (data.memoryUsage as number) > this.metrics.peakMemoryUsage) {
        this.metrics.peakMemoryUsage = data.memoryUsage as number
      }
      this.saveMetrics()
    })
  }

  // Register a hook
  on(event: HookEvent, callback: HookCallback): () => void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, [])
    }
    this.hooks.get(event)!.push(callback)

    // Return cleanup function
    return () => {
      const callbacks = this.hooks.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index !== -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  // Trigger a hook
  trigger(event: HookEvent, data: Record<string, unknown> = {}): void {
    const callbacks = this.hooks.get(event)
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(event, data)
        } catch (error) {
          console.error(`[Hooks] Error in hook ${event}:`, error)
        }
      })
    }
  }

  // Generate improvement suggestions based on usage
  generateSuggestions(): ImprovementSuggestion[] {
    this.suggestions = []

    // Check if user could benefit from larger models
    const mostUsedModel = Object.entries(this.metrics.modelUsage)
      .sort((a, b) => b[1].count - a[1].count)[0]

    if (mostUsedModel && mostUsedModel[0].includes('8B') && this.metrics.totalMessages > 50) {
      this.suggestions.push({
        id: 'upgrade-model',
        type: 'model',
        priority: 'medium',
        title: 'Consider a larger model',
        description: `You've sent ${this.metrics.totalMessages} messages. Your hardware can handle larger models like Llama 3.3 70B for better responses.`,
      })
    }

    // Check if context size could be increased
    if (this.metrics.preferredContextSize < 32768 && this.metrics.totalSessions > 10) {
      this.suggestions.push({
        id: 'increase-context',
        type: 'settings',
        priority: 'low',
        title: 'Increase context window',
        description: 'Your conversations could benefit from a larger context window for better continuity.',
      })
    }

    // Feature discovery
    if (this.metrics.featureUsage.pdfChat === 0 && this.metrics.totalMessages > 20) {
      this.suggestions.push({
        id: 'discover-pdf',
        type: 'feature',
        priority: 'low',
        title: 'Chat with documents',
        description: 'You can import PDFs and have AI analyze them with your local model.',
      })
    }

    // Performance optimization
    if (this.metrics.avgResponseTime > 5000) {
      this.suggestions.push({
        id: 'optimize-performance',
        type: 'performance',
        priority: 'high',
        title: 'Optimize response times',
        description: 'Consider using a smaller quantization or reducing context size for faster responses.',
      })
    }

    return this.suggestions
  }

  // Get current metrics
  getMetrics(): UsageMetrics {
    return { ...this.metrics }
  }

  // Get suggestions
  getSuggestions(): ImprovementSuggestion[] {
    return this.generateSuggestions()
  }

  // Dismiss a suggestion
  dismissSuggestion(id: string): void {
    const suggestion = this.suggestions.find((s) => s.id === id)
    if (suggestion) {
      suggestion.dismissedAt = Date.now()
    }
  }

  // Reset metrics (for testing or user request)
  resetMetrics(): void {
    this.metrics = this.loadMetrics()
    this.metrics.totalSessions = 0
    this.metrics.totalMessages = 0
    this.metrics.avgResponseTime = 0
    this.metrics.modelUsage = {}
    this.metrics.featureUsage = {
      pdfChat: 0,
      imageChat: 0,
      codeGeneration: 0,
      toolCalling: 0,
    }
    this.saveMetrics()
  }
}

export const hooksManager = new HooksManager()
