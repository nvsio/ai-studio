import {
  app,
  type BrowserWindow,
  type DownloadItem,
  type Event,
  ipcMain,
} from 'electron'
import { existsSync } from 'fs'
import { access, constants, unlink } from 'fs/promises'

import { sendToRenderer } from '@/webcontents'

import { ModelChannel, ModelEvent } from '../../preload/events'

export class ElectronModelManager {
  downloads = new Map<string, DownloadItem>()

  constructor(readonly window: BrowserWindow) {
    window.webContents.session.on('will-download', this.onWillDownload)
  }

  onWillDownload = (_event: Event, item: DownloadItem) => {
    this.addDownload(item)
  }

  addDownload(downloadItem: DownloadItem) {
    if (this.downloads.has(downloadItem.getFilename())) {
      console.warn('Already downloading:', downloadItem.getFilename())
      return
    }
    downloadItem.addListener('updated', () => {
      sendToRenderer(this.window.webContents, ModelEvent.DownloadProgress, {
        filename: downloadItem.getFilename(),
        receivedBytes: downloadItem.getReceivedBytes(),
        totalBytes: downloadItem.getTotalBytes(),
      })
    })

    downloadItem.addListener('done', (_event, state) => {
      sendToRenderer(this.window.webContents, ModelEvent.DownloadComplete, {
        state,
        filename: downloadItem.getFilename(),
        savePath: downloadItem.getSavePath(),
        receivedBytes: downloadItem.getReceivedBytes(),
        totalBytes: downloadItem.getTotalBytes(),
      })
      downloadItem.removeAllListeners()
      this.downloads.delete(downloadItem.getFilename())
    })

    const savePath = `${app.getPath(
      'userData',
    )}/models/${downloadItem.getFilename()}`

    console.log('Saving file to:', savePath)
    downloadItem.setSavePath(savePath)

    this.downloads.set(downloadItem.getFilename(), downloadItem)
  }

  async deleteModelFile(filename: string) {
    const modelPath = `${app.getPath('userData')}/models/${filename}`

    await unlink(modelPath)
  }

  close() {
    this.window.webContents.session.off('will-download', this.onWillDownload)
    this.downloads.forEach((download) => {
      download.cancel()
      download.removeAllListeners()
    })
    this.downloads.clear()
  }

  haveLocalModel(filename: string) {
    return existsSync(`${app.getPath('userData')}/models/${filename}`)
  }

  haveDefaultModel() {
    // Check for any of the recommended default models
    const defaultModels = [
      'Llama-3.2-8B-Instruct-Q4_K_M.gguf',
      'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
      'Llama-3.3-70B-Instruct-Q4_K_M.gguf',
      'Qwen2.5-Coder-32B-Instruct-Q4_K_M.gguf',
      // Legacy fallback
      'mistral-7b-instruct-v0.1.Q4_K_M.gguf',
    ]

    return defaultModels.some((model) => this.haveLocalModel(model))
  }

  // Get the best available model based on hardware
  getBestAvailableModel(): string | null {
    const defaultModels = [
      'Llama-3.3-70B-Instruct-Q4_K_M.gguf',
      'Qwen2.5-Coder-32B-Instruct-Q4_K_M.gguf',
      'Llama-3.2-8B-Instruct-Q4_K_M.gguf',
      'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
      'mistral-7b-instruct-v0.1.Q4_K_M.gguf',
    ]

    for (const model of defaultModels) {
      if (this.haveLocalModel(model)) {
        return model
      }
    }
    return null
  }

  addClientEventHandlers() {
    ipcMain.handle(ModelChannel.CancelDownload, (_, filename) => {
      const downloadItem = this.downloads.get(filename)
      if (!downloadItem) {
        console.warn('No download found for:', filename)
        return
      }
      downloadItem.cancel()
    })

    ipcMain.handle(ModelChannel.PauseDownload, (_, filename) => {
      const downloadItem = this.downloads.get(filename)
      if (!downloadItem) {
        console.warn('No download found for:', filename)
        return
      }
      downloadItem.pause()
    })

    ipcMain.handle(ModelChannel.ResumeDownload, (_, filename) => {
      const downloadItem = this.downloads.get(filename)
      if (!downloadItem) {
        console.warn('No download found for:', filename)
        return
      }
      downloadItem.resume()
    })

    ipcMain.handle(ModelChannel.GetFilePath, async (_, filename) => {
      const path = `${app.getPath('userData')}/models/${filename}`
      try {
        await access(path, constants.F_OK)
        return path
      } catch {
        return null
      }
    })

    ipcMain.handle(ModelChannel.DeleteModelFile, async (_, filename) => {
      await this.deleteModelFile(filename)
    })

    ipcMain.handle(ModelChannel.IsModelDownloaded, async (_, filename) => {
      return this.haveLocalModel(filename)
    })
  }
}
