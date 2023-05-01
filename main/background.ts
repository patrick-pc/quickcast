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
  dialog,
} from 'electron'
import { autoUpdater } from 'electron-updater'
import serve from 'electron-serve'
import path from 'path'

let mainWindow = undefined
const width = 750
const height = 475
const isProd: boolean = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

app.on('ready', async () => {
  await createMainWindow()
  createTray()
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
    // vibrancy: 'ultra-dark',
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

  // Restart the app
  globalShortcut.register('Cmd+0', () => {
    app.relaunch()
    app.exit()
  })

  // Check for updates
  autoUpdater.checkForUpdates()
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

ipcMain.on('open-chatgpt', () => {
  const browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  mainWindow.setBrowserView(browserView)
  browserView.setBounds({ x: 0, y: 0, width: 750, height: 475 })
  browserView.webContents.loadURL('https://chat.openai.com/')
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
  mainWindow.webContents.send('update-downloaded')
})

app.on('browser-window-focus', function () {
  globalShortcut.register('CommandOrControl+R', () => {
    mainWindow.webContents.send('refresh')
  })
  globalShortcut.register('F5', () => {
    mainWindow.webContents.send('refresh')
  })
})

app.on('browser-window-blur', function () {
  globalShortcut.unregister('CommandOrControl+R')
  globalShortcut.unregister('F5')
})
