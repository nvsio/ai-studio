import { ChildProcess, execFile } from 'child_process'
import pidusage from 'pidusage'

import llamaServer from '../../../resources/llamacpp/server?asset&asarUnpack'
import { hardwareManager } from './hardware'

// Dynamic context size based on available hardware
function getOptimalContextSize(): number {
  const profile = hardwareManager.getProfile()
  return profile.recommended.contextSize
}

// Dynamic GPU layers based on hardware capabilities
function getOptimalGpuLayers(): number {
  const profile = hardwareManager.getProfile()
  return profile.recommended.gpuLayers
}

// Dynamic CPU threads based on performance cores
function getOptimalThreads(): number {
  const profile = hardwareManager.getProfile()
  return profile.recommended.cpuThreads
}

// Dynamic batch size for throughput optimization
function getOptimalBatchSize(): number {
  const profile = hardwareManager.getProfile()
  return profile.recommended.batchSize
}

export type CompletionParams = {
  prompt?: string
  temperature?: number
  top_k?: number
  top_p?: number
  min_p?: number
  n_predict?: number
  n_keep?: number
  stop?: string[]
  presence_penalty?: number
  frequency_penalty?: number
  grammar?: string
  seed?: number
  stream?: boolean
  image_data?: { data: string; id: number }[]
}

type LaunchOptions = {
  id: string
  modelPath: string
  multimodal?: boolean
  mmprojPath?: string
  port?: string
  // Optional overrides for hardware-detected defaults
  contextSize?: number
  gpuLayers?: number
  threads?: number
  batchSize?: number
}

export class ElectronLlamaServerManager {
  launchOptions = new Map<string, LaunchOptions>()
  processes = new Map<string, ChildProcess>()
  loading = new Map<string, Promise<unknown>>()

  async launchServer(options: LaunchOptions) {
    const {
      id,
      modelPath,
      mmprojPath,
      multimodal = false,
      port,
      contextSize,
      gpuLayers,
      threads,
      batchSize,
    } = options

    if (this.loading.has(id)) {
      return this.loading.get(id)
    }

    // Use provided values or fall back to hardware-optimized defaults
    const effectiveContextSize = contextSize ?? getOptimalContextSize()
    const effectiveGpuLayers = gpuLayers ?? getOptimalGpuLayers()
    const effectiveThreads = threads ?? getOptimalThreads()
    const effectiveBatchSize = batchSize ?? getOptimalBatchSize()

    // Log hardware profile for debugging
    const hwProfile = hardwareManager.getProfile()
    console.log('[LLAMACPP] Hardware Profile:', {
      chip: `${hwProfile.generation} ${hwProfile.variant}`,
      memory: `${hwProfile.totalMemoryGB}GB`,
      gpuCores: hwProfile.gpuCores,
    })
    console.log('[LLAMACPP] Launch Config:', {
      contextSize: effectiveContextSize,
      gpuLayers: effectiveGpuLayers,
      threads: effectiveThreads,
      batchSize: effectiveBatchSize,
    })

    const args = [
      '-m',
      modelPath,
      '-c',
      effectiveContextSize.toString(),
      '-ngl',
      effectiveGpuLayers.toString(),
      '-t',
      effectiveThreads.toString(),
      '-b',
      effectiveBatchSize.toString(),
    ]
    if (multimodal && mmprojPath) {
      args.push('--mmproj', mmprojPath)
    }
    if (port) {
      args.push('--port', port)
    }

    const promise = new Promise((resolve, reject) => {
      const process = execFile(llamaServer, args, (err) => {
        if (err) {
          console.error(err)
          reject(err)
          return
        }
      })

      const handler = (data) => {
        const message = data.toString().split('\n')
        message.forEach((line: string) => {
          if (line.length === 0) {
            return
          }
          try {
            const message = JSON.parse(line)
            if (message.message == 'HTTP server listening') {
              process.stdout?.off('data', handler)
              this.launchOptions.set(id, options)
              resolve(void undefined)
            }
          } catch {
            // empty
          }
        })
      }

      process.stdout?.on('data', handler)
      this.handleProcess(id, process)
    })

    this.loading.set(id, promise)

    return promise
  }

  private handleProcess(id: string, process: ChildProcess) {
    this.processes.set(id, process)

    process.on('close', (code, signal) => {
      console.log(
        `[LLAMACPP] Process ${process.pid} closed with code ${code}, ${signal}`,
      )
      this.processes.delete(id)
      this.loading.delete(id)

      if (signal === 'SIGSEGV' && this.launchOptions.get(id)) {
        console.log(`[LLAMACPP] Restarting process ${process.pid}`)
        this.launchServer(this.launchOptions.get(id)!)
      }
    })

    process.stdout?.on('data', (data) => {
      const message = data.toString().split('\n')
      message.forEach((line: string) => {
        if (line.length === 0) {
          return
        }
        if (!line.trim().startsWith('{')) {
          console.log(line)
          return
        }
        try {
          const message = JSON.parse(line)
          console.group(`[LLAMACPP] Process: ${process.pid}`)
          console.log(message)
          console.groupEnd()
        } catch (err) {
          console.log('Could not parse stdout message:', data.toString(), err)
        }
      })
    })

    this.processes.set(id, process)
  }

  async getModelParameters() {
    const res = await fetch('http://127.0.0.1:8080/model.json')
    const data = await res.json()

    return {
      contextSize: data.n_ctx,
      modelPath: data.model,
    }
  }

  async encode(content: string): Promise<number[]> {
    const res = await fetch('http://127.0.0.1:8080/tokenize', {
      body: JSON.stringify({ content }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    const data = await res.json()
    return data.tokens
  }

  cleanupProcess(id: string) {
    const process = this.processes.get(id)
    if (process) {
      const killed = process.kill()
      if (!killed) {
        process.kill('SIGKILL')
      }
      this.processes.delete(id)
      this.loading.delete(id)
    }
  }

  close() {
    this.processes.forEach((process) => {
      process.kill()
    })
    this.processes.clear()
    this.loading.clear()
  }

  async memoryUsage(): Promise<number> {
    const pids = Array.from(this.processes.values())
      .map((p) => p.pid)
      .filter((p) => p) as number[]
    return new Promise((resolve) => {
      pidusage(pids, (err, stats) => {
        if (err) {
          resolve(0)
        } else {
          resolve(
            Object.values(stats).reduce((acc, curr) => acc + curr.memory, 0),
          )
        }
      })
    })
  }
}
