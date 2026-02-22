/**
 * IPC处理器
 * 处理来自渲染进程的所有IPC请求
 */

import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as fs from 'fs';
import { GameController } from './game-controller';
import { SettingsManager } from './settings-manager';
import { PathManager } from './utils/path-manager';
import {
  GameState,
  AIProfile,
  BoardSize,
  UserSettings,
  EngineType,
} from '../shared/types';

/**
 * IPC处理器类
 */
export class IPCHandlers {
  private gameController: GameController | null = null;
  private settingsManager: SettingsManager;
  private pathManager: PathManager;
  private mainWindow: BrowserWindow | null = null;

  constructor(pathManager: PathManager, settingsManager: SettingsManager) {
    this.pathManager = pathManager;
    this.settingsManager = settingsManager;
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 注册所有IPC处理器
   */
  registerHandlers(): void {
    this.registerGameHandlers();
    this.registerSettingsHandlers();
    this.registerSGFHandlers();
    this.registerDialogHandlers();
    this.registerWindowHandlers();
    this.registerAppHandlers();
    this.registerLogHandlers();
  }

  /**
   * 注册游戏控制相关处理器
   */
  private registerGameHandlers(): void {
    // 开始新游戏
    ipcMain.handle(
      'game:start',
      async (
        _event,
        boardSize: BoardSize,
        aiBlack: AIProfile,
        aiWhite: AIProfile,
        komi: number,
        handicap: number
      ) => {
        try {
          // 关键修复：如果已有控制器，先关闭它防止进程泄漏
          if (this.gameController) {
            await this.gameController.shutdown();
          }

          // 创建新的游戏控制器
          this.gameController = new GameController(
            boardSize,
            aiBlack,
            aiWhite,
            this.pathManager
          );

          // 设置游戏状态更新回调
          this.gameController.onStateUpdate((state: GameState) => {
            this.sendToRenderer('game:state-update', state);
          });

          // 设置着法回调
          this.gameController.onMove((move) => {
            this.sendToRenderer('game:move', move);
          });

          // 设置游戏结束回调
          this.gameController.onGameEnd((result) => {
            this.sendToRenderer('game:end', result);
          });

          // 设置游戏结束回调（结构化 GameOverResult 格式）
          this.gameController.onGameOver((result) => {
            this.sendToRenderer('game:over', result);
          });

          // 设置分析数据更新回调
          this.gameController.onAnalyzeUpdate((data) => {
            this.sendToRenderer('engine:analyze-update', data);
          });

          // 设置错误回调
          this.gameController.onError((error) => {
            this.sendToRenderer('game:error', error);
          });

          // 启动游戏
          await this.gameController.startNewGame({
            boardSize,
            aiBlack,
            aiWhite,
            komi,
            handicap,
          });
        } catch (error: any) {
          console.error('启动游戏失败:', error);
          throw new Error(`启动游戏失败: ${error.message}`);
        }
      }
    );

    // 暂停游戏
    ipcMain.handle('game:pause', async () => {
      if (!this.gameController) {
        throw new Error('游戏未启动');
      }
      this.gameController.pause();
    });

    // 恢复游戏
    ipcMain.handle('game:resume', async () => {
      if (!this.gameController) {
        throw new Error('游戏未启动');
      }
      this.gameController.resume();
    });

    // 停止游戏
    ipcMain.handle('game:stop', async () => {
      if (!this.gameController) {
        throw new Error('游戏未启动');
      }
      // 停止游戏并清理
      this.gameController.shutdown();
      this.gameController = null;
    });

    // 设置游戏速度
    ipcMain.handle('game:set-speed', async (_event, speed: number) => {
      if (!this.gameController) {
        throw new Error('游戏未启动');
      }
      this.gameController.changeSpeed(speed);
    });


    // 改变棋盘大小 (请检查是否有这一段)
    ipcMain.handle('game:change-board-size', async (_event, size: number) => {
      if (!this.gameController) {
        // 如果控制器还没初始化，先用默认参数初始化一个
        // 这种情况很少见，通常 App 启动时就初始化了
        throw new Error('游戏控制器未初始化');
      }
      await this.gameController.changeBoardSize(size as BoardSize);
    });


    // 获取当前游戏状态
    ipcMain.handle('game:get-state', async () => {
      if (!this.gameController) {
        throw new Error('游戏未启动');
      }
      return this.gameController.getGameState();
    });
  }

  /**
   * 注册设置管理相关处理器
   */
  private registerSettingsHandlers(): void {
    // 获取设置
    ipcMain.handle('settings:get', async () => {
      return this.settingsManager.getSettings();
    });

    // 更新设置
    ipcMain.handle('settings:update', async (_event, updates: Partial<UserSettings>) => {
      this.settingsManager.updateSettings(updates);
    });

    // 重置设置
    ipcMain.handle('settings:reset', async () => {
      this.settingsManager.resetToDefaults();
    });

    // 获取引擎路径
    ipcMain.handle('settings:get-engine-path', async (_event, engineType: EngineType) => {
      return this.settingsManager.getEnginePath(engineType);
    });

    // 设置引擎路径
    ipcMain.handle('settings:set-engine-path', async (_event, engineType: EngineType, path: string) => {
      this.settingsManager.setEnginePath(engineType, path);
    });

    // 检查引擎是否可用
    ipcMain.handle('settings:is-engine-available', async (_event, engineType: EngineType) => {
      return this.settingsManager.isEngineAvailable(engineType);
    });

    // 获取所有可用的引擎
    ipcMain.handle('settings:get-available-engines', async () => {
      return this.settingsManager.getAvailableEngines();
    });

    // 导出设置
    ipcMain.handle('settings:export', async () => {
      return this.settingsManager.exportSettings();
    });

    // 导入设置
    ipcMain.handle('settings:import', async (_event, json: string) => {
      this.settingsManager.importSettings(json);
    });
  }

  /**
   * 注册SGF棋谱相关处理器
   */
  private registerSGFHandlers(): void {
    const { SGFManager } = require('./utils/sgf-manager');

    // 保存游戏
    ipcMain.handle('sgf:save', async (_event, filename: string) => {
      if (!this.gameController) {
        throw new Error('游戏未启动');
      }
      const gameState = this.gameController.getGameState();
      const sgfContent = SGFManager.exportToSGF(gameState);
      const filePath = this.pathManager.getGameFilePath(filename);
      this.pathManager.writeFile(filePath, sgfContent);
      return filePath;
    });

    // 加载游戏
    ipcMain.handle('sgf:load', async (_event, filename: string) => {
      const filePath = this.pathManager.getGameFilePath(filename);
      const sgfContent = this.pathManager.readFile(filePath);
      return SGFManager.parseSGF(sgfContent);
    });

    // 列出所有保存的游戏
    ipcMain.handle('sgf:list', async () => {
      return this.pathManager.listGameFiles();
    });

    // 删除游戏文件
    ipcMain.handle('sgf:delete', async (_event, filename: string) => {
      return this.pathManager.deleteGameFile(filename);
    });

    // 导出SGF字符串
    ipcMain.handle('sgf:export', async () => {
      if (!this.gameController) {
        throw new Error('游戏未启动');
      }
      return SGFManager.exportToSGF(this.gameController.getGameState());
    });

    // 导入SGF字符串
    ipcMain.handle('sgf:import', async (_event, sgfContent: string) => {
      return SGFManager.parseSGF(sgfContent);
    });

    // 保存 SGF 到文件（弹出系统保存对话框）
    ipcMain.handle('sgf:save-file', async (_event, sgfContent: string) => {
      if (!this.mainWindow) {
        throw new Error('主窗口未初始化');
      }

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const defaultName = `game_${dateStr}.sgf`;

      const result = await dialog.showSaveDialog(this.mainWindow, {
        title: '保存 SGF 棋谱',
        defaultPath: defaultName,
        filters: [
          { name: 'SGF 棋谱文件', extensions: ['sgf'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      fs.writeFileSync(result.filePath, sgfContent, 'utf-8');
      return result.filePath;
    });
  }

  /**
   * 注册文件对话框相关处理器
   */
  private registerDialogHandlers(): void {
    // 打开文件对话框
    ipcMain.handle('dialog:open-file', async (_event, options: any) => {
      if (!this.mainWindow) {
        throw new Error('主窗口未初始化');
      }

      const result = await dialog.showOpenDialog(this.mainWindow, {
        title: options.title || '选择文件',
        filters: options.filters || [],
        properties: options.properties || ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    });

    // 保存文件对话框
    ipcMain.handle('dialog:save-file', async (_event, options: any) => {
      if (!this.mainWindow) {
        throw new Error('主窗口未初始化');
      }

      const result = await dialog.showSaveDialog(this.mainWindow, {
        title: options.title || '保存文件',
        defaultPath: options.defaultPath || '',
        filters: options.filters || [],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    });
  }

  /**
   * 注册窗口控制相关处理器
   */
  private registerWindowHandlers(): void {
    // 最小化窗口
    ipcMain.on('window:minimize', () => {
      if (this.mainWindow) {
        this.mainWindow.minimize();
      }
    });

    // 最大化/还原窗口
    ipcMain.on('window:toggle-maximize', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
    });

    // 关闭窗口
    ipcMain.on('window:close', () => {
      if (this.mainWindow) {
        this.mainWindow.close();
      }
    });
  }

  /**
   * 注册应用控制相关处理器
   */
  private registerAppHandlers(): void {
    // 获取应用版本
    ipcMain.handle('app:get-version', async () => {
      const { app } = require('electron');
      return app.getVersion();
    });

    // 获取应用名称
    ipcMain.handle('app:get-name', async () => {
      const { app } = require('electron');
      return app.getName();
    });

    // 打开外部链接
    ipcMain.handle('app:open-external', async (_event, url: string) => {
      await shell.openExternal(url);
    });
  }

  /**
   * 注册日志相关处理器
   */
  private registerLogHandlers(): void {
    ipcMain.on('log', (_event, level: string, message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      switch (level) {
        case 'info':
          console.log(logMessage, data || '');
          break;
        case 'warn':
          console.warn(logMessage, data || '');
          break;
        case 'error':
          console.error(logMessage, data || '');
          break;
        default:
          console.log(logMessage, data || '');
      }
    });
  }

  /**
   * 向渲染进程发送消息
   */
  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.gameController) {
      this.gameController.shutdown();
      this.gameController = null;
    }
  }
}
