/**
 * Preload脚本
 * 在渲染进程中安全地暴露主进程API
 * 使用Context Isolation确保安全性
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  GameState,
  GameOverResult,
  AIProfile,
  BoardSize,
  UserSettings,
  EngineType,
  Coordinate,
} from '../shared/types';

/**
 * 暴露给渲染进程的API
 */
const api = {
  // ==================== 游戏控制 ====================

  /**
   * 开始新游戏
   */
  startGame: (
    boardSize: BoardSize,
    aiBlack: AIProfile,
    aiWhite: AIProfile,
    komi: number,
    handicap: number
  ): Promise<void> => {
    return ipcRenderer.invoke('game:start', boardSize, aiBlack, aiWhite, komi, handicap);
  },

  /**
   * 暂停游戏
   */
  pauseGame: (): Promise<void> => {
    return ipcRenderer.invoke('game:pause');
  },

  /**
   * 恢复游戏
   */
  resumeGame: (): Promise<void> => {
    return ipcRenderer.invoke('game:resume');
  },

  /**
   * 停止游戏
   */
  stopGame: (): Promise<void> => {
    return ipcRenderer.invoke('game:stop');
  },

  /**
   * 设置游戏速度
   */
  setSpeed: (speed: number): Promise<void> => {
    return ipcRenderer.invoke('game:set-speed', speed);
  },

  /**
   * 获取当前游戏状态
   */
  getGameState: (): Promise<GameState> => {
    return ipcRenderer.invoke('game:get-state');
  },

  /**
   * 监听游戏状态更新
   */
  onGameStateUpdate: (callback: (state: GameState) => void): (() => void) => {
    const listener = (_event: any, state: GameState) => callback(state);
    ipcRenderer.on('game:state-update', listener);

    // 返回取消监听的函数
    return () => {
      ipcRenderer.removeListener('game:state-update', listener);
    };
  },

  /**
   * 监听着法事件
   */
  onMove: (callback: (move: { color: string; position: Coordinate; moveNumber: number }) => void): (() => void) => {
    const listener = (_event: any, move: any) => callback(move);
    ipcRenderer.on('game:move', listener);

    return () => {
      ipcRenderer.removeListener('game:move', listener);
    };
  },

  /**
   * 监听游戏结束事件
   */
  onGameEnd: (callback: (result: { winner: string; score: string; reason: string }) => void): (() => void) => {
    const listener = (_event: any, result: any) => callback(result);
    ipcRenderer.on('game:end', listener);

    return () => {
      ipcRenderer.removeListener('game:end', listener);
    };
  },

  /**
   * 监听引擎分析数据更新（胜率 + 领先目数）
   */
  onAnalyzeUpdate: (callback: (data: { winrate: number; scorelead: number }) => void): (() => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('engine:analyze-update', listener);

    return () => {
      ipcRenderer.removeListener('engine:analyze-update', listener);
    };
  },

  /**
   * 监听游戏结束事件（结构化结果）
   */
  onGameOver: (callback: (result: GameOverResult) => void): (() => void) => {
    const listener = (_event: any, result: GameOverResult) => callback(result);
    ipcRenderer.on('game:over', listener);

    return () => {
      ipcRenderer.removeListener('game:over', listener);
    };
  },

  /**
   * 监听错误事件
   */
  onError: (callback: (error: { message: string; details?: string }) => void): (() => void) => {
    const listener = (_event: any, error: any) => callback(error);
    ipcRenderer.on('game:error', listener);

    return () => {
      ipcRenderer.removeListener('game:error', listener);
    };
  },

  // ==================== 设置管理 ====================

  /**
   * 获取用户设置
   */
  getSettings: (): Promise<UserSettings> => {
    return ipcRenderer.invoke('settings:get');
  },

  /**
   * 更新用户设置
   */
  updateSettings: (updates: Partial<UserSettings>): Promise<void> => {
    return ipcRenderer.invoke('settings:update', updates);
  },

  /**
   * 保存用户设置（完整设置对象）
   */
  saveSettings: (settings: UserSettings): Promise<void> => {
    return ipcRenderer.invoke('settings:update', settings);
  },

  /**
   * 重置为默认设置
   */
  resetSettings: (): Promise<void> => {
    return ipcRenderer.invoke('settings:reset');
  },

  /**
   * 获取引擎路径
   */
  getEnginePath: (engineType: EngineType): Promise<string> => {
    return ipcRenderer.invoke('settings:get-engine-path', engineType);
  },

  /**
   * 设置引擎路径
   */
  setEnginePath: (engineType: EngineType, path: string): Promise<void> => {
    return ipcRenderer.invoke('settings:set-engine-path', engineType, path);
  },

  /**
   * 检查引擎是否可用
   */
  isEngineAvailable: (engineType: EngineType): Promise<boolean> => {
    return ipcRenderer.invoke('settings:is-engine-available', engineType);
  },

  /**
   * 获取所有可用的引擎
   */
  getAvailableEngines: (): Promise<EngineType[]> => {
    return ipcRenderer.invoke('settings:get-available-engines');
  },

  /**
   * 导出设置
   */
  exportSettings: (): Promise<string> => {
    return ipcRenderer.invoke('settings:export');
  },

  /**
   * 导入设置
   */
  importSettings: (json: string): Promise<void> => {
    return ipcRenderer.invoke('settings:import', json);
  },

  // ==================== 棋谱管理 ====================

  /**
   * 保存当前游戏为SGF
   */
  saveGame: (filename: string): Promise<void> => {
    return ipcRenderer.invoke('sgf:save', filename);
  },

  /**
   * 加载SGF文件
   */
  loadGame: (filename: string): Promise<GameState> => {
    return ipcRenderer.invoke('sgf:load', filename);
  },

  /**
   * 列出所有保存的游戏
   */
  listGames: (): Promise<string[]> => {
    return ipcRenderer.invoke('sgf:list');
  },

  /**
   * 删除游戏文件
   */
  deleteGame: (filename: string): Promise<boolean> => {
    return ipcRenderer.invoke('sgf:delete', filename);
  },

  /**
   * 导出当前游戏为SGF字符串
   */
  exportSGF: (): Promise<string> => {
    return ipcRenderer.invoke('sgf:export');
  },

  /**
   * 从SGF字符串导入游戏
   */
  importSGF: (sgfContent: string): Promise<GameState> => {
    return ipcRenderer.invoke('sgf:import', sgfContent);
  },

  /**
   * 保存 SGF 到文件（弹出系统保存对话框）
   * 返回保存的文件路径，取消则返回 null
   */
  saveSGFFile: (sgfContent: string): Promise<string | null> => {
    return ipcRenderer.invoke('sgf:save-file', sgfContent);
  },

  // ==================== 文件对话框 ====================

  /**
   * 打开文件选择对话框
   */
  openFileDialog: (options: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  }): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:open-file', options);
  },

  /**
   * 打开保存文件对话框
   */
  saveFileDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:save-file', options);
  },

  // ==================== 应用控制 ====================

  /**
   * 最小化窗口
   */
  minimizeWindow: (): void => {
    ipcRenderer.send('window:minimize');
  },

  /**
   * 最大化/还原窗口
   */
  toggleMaximizeWindow: (): void => {
    ipcRenderer.send('window:toggle-maximize');
  },

  /**
   * 关闭窗口
   */
  closeWindow: (): void => {
    ipcRenderer.send('window:close');
  },

  /**
   * 获取应用版本
   */
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('app:get-version');
  },

  /**
   * 获取应用名称
   */
  getAppName: (): Promise<string> => {
    return ipcRenderer.invoke('app:get-name');
  },

  /**
   * 打开外部链接
   */
  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke('app:open-external', url);
  },

  // ==================== 日志 ====================

  /**
   * 记录日志
   */
  log: (level: 'info' | 'warn' | 'error', message: string, data?: any): void => {
    ipcRenderer.send('log', level, message, data);
  },
};

// 将API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', api);

// TypeScript类型声明（在renderer中使用）
export type ElectronAPI = typeof api;

// 声明全局类型
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
