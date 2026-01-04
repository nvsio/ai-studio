import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeTheme,
  Notification,
  systemPreferences,
  Tray,
  nativeImage,
  shell,
  clipboard,
  screen,
} from 'electron'
import { execSync } from 'child_process'
import { platform } from 'os'
import path from 'path'

import { hardwareManager } from './hardware'

// Type definitions for macOS-specific features
export interface MacOSFeatures {
  systemAppearance: 'light' | 'dark' | 'system'
  reduceMotion: boolean
  reduceTransparency: boolean
  isAccessibilityEnabled: boolean
  supportsTouchBar: boolean
  supportsHaptics: boolean
}

export interface QuickActionItem {
  id: string
  title: string
  subtitle?: string
  icon?: string
  shortcut?: string
  action: () => void
}

export class MacOSNativeManager {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null
  private quickInputWindow: BrowserWindow | null = null
  private registeredShortcuts: string[] = []

  constructor() {
    // Only initialize on macOS
    if (platform() !== 'darwin') {
      console.log('[MacOS] Not running on macOS, skipping native features')
      return
    }
  }

  initialize(window: BrowserWindow): void {
    if (platform() !== 'darwin') return

    this.mainWindow = window

    // Initialize all macOS features
    this.setupMenuBar()
    this.setupTray()
    this.setupGlobalShortcuts()
    this.setupAppearanceListener()
    this.setupDockMenu()
    this.setupTouchBar()
    this.addClientEventHandlers()

    console.log('[MacOS] Native features initialized')
  }

  // ===== MENU BAR =====
  private setupMenuBar(): void {
    const hwProfile = hardwareManager.getProfile()
    const hwSummary = `${hwProfile.generation} ${hwProfile.variant === 'base' ? '' : hwProfile.variant} | ${hwProfile.totalMemoryGB}GB`

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: 'Preferences...',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.mainWindow?.webContents.send('open-settings'),
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'File',
        submenu: [
          {
            label: 'New Chat',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.mainWindow?.webContents.send('new-chat'),
          },
          {
            label: 'New Chat from Clipboard',
            accelerator: 'CmdOrCtrl+Shift+N',
            click: () => this.newChatFromClipboard(),
          },
          { type: 'separator' },
          {
            label: 'Open File...',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.mainWindow?.webContents.send('open-file'),
          },
          {
            label: 'Open Models Folder',
            click: () => {
              shell.openPath(path.join(app.getPath('userData'), 'models'))
            },
          },
          { type: 'separator' },
          {
            label: 'Export Chat...',
            accelerator: 'CmdOrCtrl+Shift+E',
            click: () => this.mainWindow?.webContents.send('export-chat'),
          },
          { type: 'separator' },
          { role: 'close' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
          },
        ],
      },
      {
        label: 'Chat',
        submenu: [
          {
            label: 'Regenerate Response',
            accelerator: 'CmdOrCtrl+R',
            click: () => this.mainWindow?.webContents.send('regenerate-response'),
          },
          {
            label: 'Stop Generation',
            accelerator: 'Escape',
            click: () => this.mainWindow?.webContents.send('stop-generation'),
          },
          { type: 'separator' },
          {
            label: 'Copy Last Response',
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => this.mainWindow?.webContents.send('copy-last-response'),
          },
          {
            label: 'Clear Chat',
            accelerator: 'CmdOrCtrl+K',
            click: () => this.mainWindow?.webContents.send('clear-chat'),
          },
          { type: 'separator' },
          {
            label: 'Focus Input',
            accelerator: 'CmdOrCtrl+L',
            click: () => this.mainWindow?.webContents.send('focus-input'),
          },
        ],
      },
      {
        label: 'Model',
        submenu: [
          {
            label: 'Switch Model...',
            accelerator: 'CmdOrCtrl+Shift+M',
            click: () => this.mainWindow?.webContents.send('open-model-picker'),
          },
          {
            label: 'Download Models...',
            click: () => this.mainWindow?.webContents.send('open-model-downloads'),
          },
          { type: 'separator' },
          {
            label: `Hardware: ${hwSummary}`,
            enabled: false,
          },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
          { type: 'separator' },
          {
            label: 'Toggle Sidebar',
            accelerator: 'CmdOrCtrl+\\',
            click: () => this.mainWindow?.webContents.send('toggle-sidebar'),
          },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          {
            label: 'Quick Input',
            accelerator: 'CmdOrCtrl+Shift+Space',
            click: () => this.showQuickInput(),
          },
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
            click: () => shell.openExternal('https://github.com/dynaboard/ai-studio'),
          },
          {
            label: 'Keyboard Shortcuts',
            accelerator: 'CmdOrCtrl+/',
            click: () => this.mainWindow?.webContents.send('show-shortcuts'),
          },
          { type: 'separator' },
          {
            label: 'Report Issue...',
            click: () => shell.openExternal('https://github.com/dynaboard/ai-studio/issues'),
          },
        ],
      },
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  // ===== TRAY (Menu Bar Icon) =====
  private setupTray(): void {
    // Create a template image for macOS menu bar
    // Template images automatically adapt to light/dark mode
    const trayIcon = this.createTrayIcon()
    this.tray = new Tray(trayIcon)

    this.tray.setToolTip('AI Studio')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'New Chat',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.webContents.send('new-chat')
        },
      },
      {
        label: 'Quick Input',
        accelerator: 'CmdOrCtrl+Shift+Space',
        click: () => this.showQuickInput(),
      },
      { type: 'separator' },
      {
        label: 'Show Window',
        click: () => this.mainWindow?.show(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit(),
      },
    ])

    this.tray.setContextMenu(contextMenu)

    // Double-click to show window
    this.tray.on('double-click', () => {
      this.mainWindow?.show()
    })
  }

  // ===== GLOBAL SHORTCUTS =====
  private setupGlobalShortcuts(): void {
    // Global shortcut to show quick input (like Spotlight/Alfred)
    const quickInputShortcut = 'CommandOrControl+Shift+Space'
    if (globalShortcut.register(quickInputShortcut, () => this.showQuickInput())) {
      this.registeredShortcuts.push(quickInputShortcut)
      console.log(`[MacOS] Registered global shortcut: ${quickInputShortcut}`)
    }

    // Global shortcut to show main window
    const showWindowShortcut = 'CommandOrControl+Shift+A'
    if (globalShortcut.register(showWindowShortcut, () => this.mainWindow?.show())) {
      this.registeredShortcuts.push(showWindowShortcut)
      console.log(`[MacOS] Registered global shortcut: ${showWindowShortcut}`)
    }
  }

  // ===== QUICK INPUT (Spotlight-like) =====
  private showQuickInput(): void {
    if (this.quickInputWindow) {
      this.quickInputWindow.show()
      this.quickInputWindow.focus()
      return
    }

    // Get the current display's work area
    const currentDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const { width: screenWidth, y: screenY } = currentDisplay.workArea

    // Calculate position (centered horizontally, 20% from top)
    const windowWidth = 600
    const windowHeight = 80
    const x = Math.round((screenWidth - windowWidth) / 2) + currentDisplay.workArea.x
    const y = screenY + Math.round(currentDisplay.workArea.height * 0.2)

    this.quickInputWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      hasShadow: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js'),
      },
    })

    // Load the quick input page
    if (process.env['ELECTRON_RENDERER_URL']) {
      this.quickInputWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/quick-input`)
    } else {
      this.quickInputWindow.loadFile(
        path.join(__dirname, '../renderer/index.html'),
        { hash: '/quick-input' }
      )
    }

    // Hide on blur
    this.quickInputWindow.on('blur', () => {
      this.quickInputWindow?.hide()
    })

    this.quickInputWindow.on('closed', () => {
      this.quickInputWindow = null
    })
  }

  // ===== APPEARANCE =====
  private setupAppearanceListener(): void {
    // Listen for system appearance changes
    nativeTheme.on('updated', () => {
      const appearance = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
      this.mainWindow?.webContents.send('system-appearance-changed', appearance)
    })

    // Listen for accent color changes (macOS specific)
    if (platform() === 'darwin') {
      systemPreferences.subscribeNotification(
        'AppleAquaColorVariantChanged',
        () => {
          const accentColor = systemPreferences.getAccentColor()
          this.mainWindow?.webContents.send('accent-color-changed', accentColor)
        }
      )
    }
  }

  // ===== DOCK MENU =====
  private setupDockMenu(): void {
    const dockMenu = Menu.buildFromTemplate([
      {
        label: 'New Chat',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.webContents.send('new-chat')
        },
      },
      {
        label: 'Quick Input',
        click: () => this.showQuickInput(),
      },
    ])

    app.dock?.setMenu(dockMenu)
  }

  // ===== TOUCH BAR (for MacBooks with Touch Bar) =====
  private setupTouchBar(): void {
    // Touch Bar is deprecated in newer Macs but we support it for older models
    try {
      const { TouchBar } = require('electron')
      const { TouchBarButton, TouchBarSpacer } = TouchBar

      const newChatBtn = new TouchBarButton({
        label: 'New Chat',
        click: () => this.mainWindow?.webContents.send('new-chat'),
      })

      const regenerateBtn = new TouchBarButton({
        label: 'Regenerate',
        click: () => this.mainWindow?.webContents.send('regenerate-response'),
      })

      const stopBtn = new TouchBarButton({
        label: 'Stop',
        click: () => this.mainWindow?.webContents.send('stop-generation'),
      })

      const touchBar = new TouchBar({
        items: [
          newChatBtn,
          new TouchBarSpacer({ size: 'flexible' }),
          regenerateBtn,
          stopBtn,
        ],
      })

      this.mainWindow?.setTouchBar(touchBar)
    } catch {
      // Touch Bar not available
    }
  }

  // ===== NOTIFICATIONS =====
  showNotification(title: string, body: string, onClick?: () => void): void {
    if (!Notification.isSupported()) return

    const notification = new Notification({
      title,
      body,
      silent: false,
    })

    if (onClick) {
      notification.on('click', onClick)
    }

    notification.show()
  }

  // ===== HELPER METHODS =====
  private createTrayIcon(): Electron.NativeImage {
    // Create a simple AI icon for the tray (16x16 template image)
    // Template images are grayscale and macOS automatically inverts them for dark mode
    const iconSize = 16
    const scale = 2 // For retina displays

    // Create a simple "AI" shaped icon using data URL
    // This creates a minimal circuit-brain style icon
    const svg = `
      <svg width="${iconSize * scale}" height="${iconSize * scale}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" stroke="black" stroke-width="2" fill="none"/>
        <circle cx="16" cy="12" r="4" fill="black"/>
        <path d="M10 22 L16 18 L22 22" stroke="black" stroke-width="2" fill="none"/>
        <circle cx="10" cy="22" r="2" fill="black"/>
        <circle cx="22" cy="22" r="2" fill="black"/>
      </svg>
    `

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    const icon = nativeImage.createFromDataURL(dataUrl)

    // Mark as template so macOS handles light/dark mode automatically
    icon.setTemplateImage(true)

    return icon.resize({ width: iconSize, height: iconSize })
  }

  private newChatFromClipboard(): void {
    const text = clipboard.readText()
    if (text) {
      this.mainWindow?.show()
      this.mainWindow?.webContents.send('new-chat-with-content', text)
    }
  }

  getSystemFeatures(): MacOSFeatures {
    let reduceMotion = false
    let reduceTransparency = false

    // Try to get animation settings if available
    try {
      const animSettings = systemPreferences.getAnimationSettings?.()
      reduceMotion = animSettings?.prefersReducedMotion ?? false
      reduceTransparency = false // Not available in newer Electron
    } catch {
      // Fallback for older Electron versions
    }

    return {
      systemAppearance: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      reduceMotion,
      reduceTransparency,
      isAccessibilityEnabled: systemPreferences.isTrustedAccessibilityClient?.(false) ?? false,
      supportsTouchBar: false, // Deprecated in M-series Macs
      supportsHaptics: platform() === 'darwin', // All modern Macs support haptics via trackpad
    }
  }

  // ===== IPC HANDLERS =====
  addClientEventHandlers(): void {
    ipcMain.handle('macos:getSystemFeatures', () => {
      return this.getSystemFeatures()
    })

    ipcMain.handle('macos:getHardwareProfile', () => {
      return hardwareManager.getProfile()
    })

    ipcMain.handle('macos:showNotification', (_, { title, body }) => {
      this.showNotification(title, body, () => this.mainWindow?.show())
    })

    ipcMain.handle('macos:setDockBadge', (_, badge: string) => {
      app.dock?.setBadge(badge)
    })

    ipcMain.handle('macos:clearDockBadge', () => {
      app.dock?.setBadge('')
    })

    ipcMain.handle('macos:bounce', () => {
      app.dock?.bounce('informational')
    })

    ipcMain.handle('macos:getAccentColor', () => {
      return systemPreferences.getAccentColor()
    })

    ipcMain.handle('macos:getSystemColors', () => {
      if (platform() !== 'darwin') return null

      return {
        accent: systemPreferences.getAccentColor(),
        controlBackground: systemPreferences.getColor('control-background'),
        selectedContent: systemPreferences.getColor('selected-content-background'),
        alternateSelectedControl: systemPreferences.getColor('selected-text-background'),
      }
    })

    ipcMain.handle('macos:executeAppleScript', async (_, script: string) => {
      // Security: Only allow specific safe scripts
      const allowedScripts = [
        'tell application "System Events" to get dark mode of appearance preferences',
      ]

      if (!allowedScripts.includes(script)) {
        throw new Error('Script not allowed')
      }

      try {
        const result = execSync(`osascript -e '${script}'`, { encoding: 'utf-8' })
        return result.trim()
      } catch (error) {
        console.error('[MacOS] AppleScript error:', error)
        return null
      }
    })

    // Handle quick input submission
    ipcMain.on('quick-input:submit', (_, message: string) => {
      this.quickInputWindow?.hide()
      this.mainWindow?.show()
      this.mainWindow?.webContents.send('new-chat-with-content', message)
    })

    ipcMain.on('quick-input:cancel', () => {
      this.quickInputWindow?.hide()
    })
  }

  // ===== CLEANUP =====
  cleanup(): void {
    // Unregister all global shortcuts
    this.registeredShortcuts.forEach((shortcut) => {
      globalShortcut.unregister(shortcut)
    })
    this.registeredShortcuts = []

    // Destroy tray
    this.tray?.destroy()
    this.tray = null

    // Close quick input window
    this.quickInputWindow?.close()
    this.quickInputWindow = null
  }
}

export const macOSNativeManager = new MacOSNativeManager()
