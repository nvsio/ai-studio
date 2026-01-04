import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { release, platform } from 'node:os'
import { join } from 'node:path'

import { ElectronChatManager } from '@/managers/chats'
import { EmbeddingsManager } from '@/managers/embeddings'
import { ElectronFilesManager } from '@/managers/files'
import { hardwareManager } from '@/managers/hardware'
import { hooksManager } from '@/managers/hooks'
import { ElectronLlamaServerManager } from '@/managers/llama-server'
import { macOSNativeManager } from '@/managers/macos-native'
import { ElectronModelManager } from '@/managers/models'
import { ElectronToolManager } from '@/managers/tools'
import { SystemUsageManager } from '@/managers/usage'
import { ElectronVectorStoreManager } from '@/managers/vector-store'
import { update } from '@/update'

import { sendToRenderer } from './webcontents'

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

// Log hardware profile on startup (for debugging)
const hwProfile = hardwareManager.getProfile()
console.log('[AI Studio] Hardware Profile:', {
  chip: `${hwProfile.generation} ${hwProfile.variant}`,
  memory: `${hwProfile.totalMemoryGB}GB`,
  gpuCores: hwProfile.gpuCores,
  recommended: hwProfile.recommended,
})

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
let modelManager: ElectronModelManager | null = null
let chatManager: ElectronChatManager | null = null
let embeddingsManager: EmbeddingsManager | null = null
let filesManager: ElectronFilesManager | null = null
const vectorStoreManager = new ElectronVectorStoreManager()
const llamaServerManager = new ElectronLlamaServerManager()
const toolManager = new ElectronToolManager(llamaServerManager)

const usageManager = new SystemUsageManager(llamaServerManager)
usageManager.addClientEventHandlers()

const preload = join(__dirname, '../preload/index.js')

async function createWindow() {
  if (modelManager) {
    modelManager.close()
  }

  vectorStoreManager.initialize()

  win = new BrowserWindow({
    title: 'AI Studio',
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Native macOS appearance
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: 'sidebar',
    visualEffectState: 'followWindow',
    backgroundColor: '#00000000', // Transparent for vibrancy
    transparent: platform() === 'darwin',
    // Smooth corners on macOS
    roundedCorners: true,
    // Enable native window shadow
    hasShadow: true,
  })

  embeddingsManager = new EmbeddingsManager(win, vectorStoreManager)
  modelManager = new ElectronModelManager(win)
  filesManager = new ElectronFilesManager()
  chatManager = new ElectronChatManager(
    win,
    embeddingsManager,
    llamaServerManager,
  )

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    if (win) {
      sendToRenderer(
        win.webContents,
        'main-process-message',
        new Date().toLocaleString(),
      )
    }
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('enter-full-screen', () => {
    if (win) {
      sendToRenderer(win.webContents, 'full-screen-change', true)
    }
  })

  win.on('leave-full-screen', () => {
    if (win) {
      sendToRenderer(win.webContents, 'full-screen-change', false)
    }
  })

  const windowActiveListener = () =>
    win ? sendToRenderer(win.webContents, 'window-active', true) : null
  const windowInactiveListener = () =>
    win ? sendToRenderer(win.webContents, 'window-active', false) : null

  win.on('hide', windowInactiveListener)
  win.on('blur', windowInactiveListener)
  win.on('show', windowActiveListener)
  win.on('focus', windowActiveListener)
  win.on('closed', () => {
    win = null
  })

  // Apply electron-updater
  update(win)

  modelManager.addClientEventHandlers()
  chatManager.addClientEventHandlers()
  embeddingsManager.addClientEventHandlers()
  toolManager.addClientEventHandlers()
  filesManager.addClientEventHandlers()

  // Initialize macOS native features (menu bar, shortcuts, etc.)
  if (platform() === 'darwin') {
    macOSNativeManager.initialize(win)
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  modelManager?.close()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

app.on('will-quit', () => {
  llamaServerManager.close()
  // Cleanup macOS native features
  if (platform() === 'darwin') {
    macOSNativeManager.cleanup()
  }
})

ipcMain.on('open-path', (_, path) => {
  shell.openPath(path)
})

// System/Hardware info handler
ipcMain.handle('system:getHardwareInfo', () => {
  const profile = hardwareManager.getProfile()
  return {
    totalMemoryGB: profile.totalMemoryGB,
    availableMemoryGB: profile.availableMemoryGB,
    cpuModel: profile.cpuModel,
    cpuCores: profile.cpuCores,
    isAppleSilicon: profile.isAppleSilicon,
    generation: profile.generation,
    variant: profile.variant,
    gpuCores: profile.gpuCores,
  }
})

// Hooks system handlers for continuous improvement
ipcMain.handle('hooks:getMetrics', () => {
  return hooksManager.getMetrics()
})

ipcMain.handle('hooks:getSuggestions', () => {
  return hooksManager.getSuggestions()
})

ipcMain.handle('hooks:dismissSuggestion', (_, id: string) => {
  hooksManager.dismissSuggestion(id)
})

ipcMain.handle('hooks:trigger', (_, event: string, data: Record<string, unknown>) => {
  hooksManager.trigger(event as any, data)
})

// Trigger session start on app launch
hooksManager.trigger('session:start', {})
