import { app, BrowserWindow } from 'electron';
import path from 'path';
import { SettingsManager } from './settings-manager';
import { PathManager } from './utils/path-manager';
import { IPCHandlers } from './ipc-handlers';

// 在 CommonJS 模式下，__dirname 和 __filename 是全局可用的
// TypeScript 编译为 CommonJS 时会自动提供这些变量

// 保持对窗口对象的全局引用，避免被垃圾回收
let mainWindow: BrowserWindow | null = null;

// 应用控制器
let settingsManager: SettingsManager;
let pathManager: PathManager;
let ipcHandlers: IPCHandlers;

// 创建主窗口
// ... 前面的引入保持不变 ...

function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // 注意：这里可能需要根据你的 dist 目录结构微调
      // 如果报错找不到 preload，试着改成 path.join(__dirname, '../preload.js')
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // 先隐藏，等加载好了再显示，防止白屏
  });

  // ================= 修改开始 =================
  // 核心修改：使用 !app.isPackaged 来判断开发环境
  // 这样就不依赖 NODE_ENV 环境变量了
  if (!app.isPackaged) {
    console.log('正在加载开发环境 URL: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    
    // 开发模式下自动打开调试工具 (F12)
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载打包后的文件
    // 注意：由于你的目录结构变成了 dist/main/main/index.js
    // 所以回到 renderer 可能需要往上跳两级：../../renderer/index.html
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }
  // ================= 修改结束 =================

  // 窗口准备就绪后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ... 后面的代码保持不变 ...


// 初始化应用
async function initializeApp(): Promise<void> {
  try {
    // 创建管理器
    pathManager = new PathManager();
    settingsManager = new SettingsManager(pathManager);
    
    // 创建IPC处理器
    ipcHandlers = new IPCHandlers(pathManager, settingsManager);
    
    // 设置主窗口引用
    if (mainWindow) {
      ipcHandlers.setMainWindow(mainWindow);
    }
    
    // 注册所有IPC处理器
    ipcHandlers.registerHandlers();
    
    console.log('应用初始化完成');
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
}

// 应用准备就绪
app.whenReady().then(async () => {
  createWindow();
  await initializeApp();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 清理资源
app.on('before-quit', () => {
  // gameController会在需要时初始化和清理
});

// 处理进程异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的Promise拒绝:', reason);
});