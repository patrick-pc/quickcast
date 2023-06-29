import {
  BrowserWindow,
  BrowserView,
  Menu,
  Tray,
  app,
  screen,
  globalShortcut,
  ipcMain,
  shell,
} from 'electron'
import { autoUpdater } from 'electron-updater'
import serve from 'electron-serve'
import Store from 'electron-store'
import path from 'path'
import { keyboard, Key } from '@nut-tree/nut-js'

keyboard.config.autoDelayMs = 0

const schema = {
  defaultKeyCombination: {
    type: 'string',
    default: 'Cmd+E',
  },
}
const store = new Store({ schema } as any)

let mainWindow = undefined
let chatGptBrowserView = undefined
let bardBrowserView = undefined

const width = 750
const height = 525

const isProd: boolean = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

app.on('ready', async () => {
  await createMainWindow()
  createTray()
  createBrowserViews()
})

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
    darkTheme: true,
    vibrancy: 'ultra-dark',
  })

  // This is to show up on all desktops/workspaces
  mainWindow.setVisibleOnAllWorkspaces(true)

  // Load index.html
  if (isProd) {
    await mainWindow.loadURL('app://./index.html')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/`)
    // mainWindow.webContents.openDevTools()
  }

  // If 'esc' is pressed, hide the app window
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape') {
      hideWindow(mainWindow)
      event.preventDefault()
    }
  })

  // Hide the window when it loses focus
  mainWindow.on('blur', () => {
    hideWindow(mainWindow)
  })

  // This opens all links with `target="_blank"` in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.platform == 'darwin') {
    // Don't show the app in the dock for macOS
    app.dock.setIcon(path.join(__dirname, 'images/icon.png'))
    app.dock.hide()
  } else {
    // Hide the app in the dock for windows and linux
    mainWindow.setSkipTaskbar(true)
  }

  // This is a global shortcut to activate the app with hotkey
  globalShortcut.register('Cmd+E', () => {
    toggleWindow(mainWindow)
  })

  // Open app on start
  toggleWindow(mainWindow)

  // Check for updates
  await autoUpdater.checkForUpdatesAndNotify()
}

const createTray = () => {
  const tray = new Tray(path.join(__dirname, 'images/logo@2x.png'))

  tray.on('click', () => {
    toggleWindow(mainWindow)
  })
  tray.on('right-click', () => {
    toggleWindow(mainWindow)
  })
  tray.on('double-click', () => {
    toggleWindow(mainWindow)
  })
}

const toggleWindow = (window: BrowserWindow) => {
  if (window.isVisible()) {
    hideWindow(window)
  } else {
    showWindow(window)
  }
}

const showWindow = (window: BrowserWindow) => {
  const activeDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const windowX = Math.round(activeDisplay.bounds.x + (activeDisplay.bounds.width - width) / 2)
  const windowY = Math.round(activeDisplay.bounds.y + (activeDisplay.bounds.height - height) / 2)

  window.webContents.send('focus')
  window.setPosition(windowX, windowY)
  window.show()
}

const hideWindow = (window: BrowserWindow) => {
  if (process.platform == 'darwin') {
    app.hide()
  } else {
    window.minimize()
  }
  window.hide()
  // window.reload()
}

const createBrowserViews = () => {
  chatGptBrowserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  mainWindow.setBrowserView(chatGptBrowserView)
  chatGptBrowserView.setBounds({ x: 0, y: 50, width: 750, height: 475 })
  chatGptBrowserView.webContents.loadURL('https://chat.openai.com/')
  chatGptBrowserView.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.addBrowserView(chatGptBrowserView)
  mainWindow.removeBrowserView(chatGptBrowserView)

  bardBrowserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  mainWindow.setBrowserView(bardBrowserView)
  bardBrowserView.setBounds({ x: 0, y: 50, width: 750, height: 475 })
  bardBrowserView.webContents.loadURL('https://bard.google.com/')
  bardBrowserView.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.addBrowserView(bardBrowserView)
  mainWindow.removeBrowserView(bardBrowserView)
}

ipcMain.on('set::keycombine', (event, combination) => {
  // Unregister old key combination
  globalShortcut.unregister(store.get('defaultKeyCombination') as string)

  // Set new key combination
  store.set('defaultKeyCombination', combination)

  // Register new key combination
  globalShortcut.register(store.get('defaultKeyCombination') as string, () => {
    toggleWindow(mainWindow)
  })

  // Send reply to renderer
  event.reply('done::keycombine', store.get('defaultKeyCombination'))
})

ipcMain.on('open-quickcast', () => {
  mainWindow.removeBrowserView(chatGptBrowserView)
  mainWindow.removeBrowserView(bardBrowserView)
  mainWindow.webContents.send('quickcast-view')
})

ipcMain.on('open-chatgpt', () => {
  mainWindow.setBrowserView(chatGptBrowserView)
  mainWindow.removeBrowserView(bardBrowserView)
  mainWindow.webContents.send('chatgpt-view')
})

ipcMain.on('open-bard', () => {
  mainWindow.setBrowserView(bardBrowserView)
  mainWindow.removeBrowserView(chatGptBrowserView)
  mainWindow.webContents.send('bard-view')
})

ipcMain.on('app-version', (event) => {
  event.sender.send('app-version', { version: app.getVersion() })
})

ipcMain.on('minimize', () => {
  hideWindow(mainWindow)
})

ipcMain.on('quit', () => {
  app.quit()
})

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall()
})

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update-available')
})

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
  mainWindow.webContents.send('update-downloaded')
})

app.on('browser-window-focus', function () {
  globalShortcut.register('Cmd+1', () => {
    mainWindow.removeBrowserView(chatGptBrowserView)
    mainWindow.removeBrowserView(bardBrowserView)
    mainWindow.webContents.send('quickcast-view')
  })

  globalShortcut.register('Cmd+2', () => {
    mainWindow.setBrowserView(chatGptBrowserView)
    mainWindow.removeBrowserView(bardBrowserView)
    mainWindow.webContents.send('chatgpt-view')
  })

  globalShortcut.register('Cmd+3', () => {
    mainWindow.setBrowserView(bardBrowserView)
    mainWindow.removeBrowserView(chatGptBrowserView)
    mainWindow.webContents.send('bard-view')
  })

  globalShortcut.register('Cmd+W', () => {
    // Unregister close window shortcut
  })

  globalShortcut.register('Cmd+R', () => {
    mainWindow.webContents.send('refresh')
  })

  globalShortcut.register('F5', () => {
    mainWindow.webContents.send('refresh')
  })

  globalShortcut.register('Enter', simulateEnter)
})

app.on('browser-window-blur', function () {
  globalShortcut.unregister('Cmd+1')
  globalShortcut.unregister('Cmd+2')
  globalShortcut.unregister('Cmd+3')
  globalShortcut.unregister('Cmd+W')
  globalShortcut.unregister('Cmd+R')
  globalShortcut.unregister('F5')
  globalShortcut.unregister('Enter')
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})

async function simulateEnter() {
  globalShortcut.unregister('Enter')

  await keyboard.pressKey(Key.LeftCmd)
  await keyboard.pressKey(Key.Enter)
  await keyboard.releaseKey(Key.LeftCmd)
  await keyboard.releaseKey(Key.Enter)

  globalShortcut.register('Enter', simulateEnter)
}
