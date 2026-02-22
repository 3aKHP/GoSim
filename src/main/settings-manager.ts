/**
 * 设置管理器
 * 负责用户设置的持久化存储和读取
 */

import { UserSettings, EngineType, BoardSize, AIProfile } from '../shared/types';
import { PathManager } from './utils/path-manager';
import fs from 'fs';

/**
 * 默认AI配置
 */
const DEFAULT_AI_BLACK: AIProfile = {
  id: 'mock-black',
  name: 'Mock引擎（黑）',
  engineType: 'mock',
  strength: 5,
  enginePath: 'mock',
  timeSettings: {
    mainTime: 300,
    byoYomi: 30,
    byoYomiPeriods: 3,
  },
  description: '用于开发测试的Mock引擎',
  available: true,
};

const DEFAULT_AI_WHITE: AIProfile = {
  id: 'mock-white',
  name: 'Mock引擎（白）',
  engineType: 'mock',
  strength: 5,
  enginePath: 'mock',
  timeSettings: {
    mainTime: 300,
    byoYomi: 30,
    byoYomiPeriods: 3,
  },
  description: '用于开发测试的Mock引擎',
  available: true,
};

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: UserSettings = {
  // 界面设置
  theme: 'auto',
  language: 'zh',
  showCoordinates: true,
  showMoveNumbers: false,
  showSuggestedMoves: false,

  // 游戏默认设置
  boardSize: 19,
  defaultBoardSize: 19,
  defaultSpeed: 5,
  defaultKomi: 6.5,
  defaultHandicap: 0,
  defaultAIBlack: DEFAULT_AI_BLACK,
  defaultAIWhite: DEFAULT_AI_WHITE,

  // AI引擎路径
  enginePaths: {
    gnugo: '',
    katago: 'engines/katago/katago.exe',
    leela: '',
    pachi: 'engines/pachi/pachi.exe',
    mock: 'mock',
    custom: '',
  },

  // KataGo 专属路径
  katagoModelPath: 'engines/katago/model.bin.gz',
  katagoConfigPath: 'engines/katago/katago.cfg',

  // 快捷键
  shortcuts: {
    newGame: 'Ctrl+N',
    pause: 'Space',
    speedUp: 'Ctrl+Up',
    speedDown: 'Ctrl+Down',
    settings: 'Ctrl+,',
    quit: 'Ctrl+Q',
  },

  // 游戏规则
  allowSuicide: false,
  allowKo: true,
  autoResign: false,
};

/**
 * 设置管理类
 */
export class SettingsManager {
  private pathManager: PathManager;
  private settings: UserSettings;
  private settingsFilePath: string;

  constructor(pathManager: PathManager) {
    this.pathManager = pathManager;
    this.settingsFilePath = pathManager.getSettingsFilePath();
    this.settings = this.loadSettings();
  }

  /**
   * 加载设置
   */
  private loadSettings(): UserSettings {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const data = fs.readFileSync(this.settingsFilePath, 'utf8');
        const loadedSettings = JSON.parse(data);

        // 合并默认设置和加载的设置（确保新增的设置项有默认值）
        return {
          ...DEFAULT_SETTINGS,
          ...loadedSettings,
          enginePaths: {
            ...DEFAULT_SETTINGS.enginePaths,
            ...loadedSettings.enginePaths,
          },
          shortcuts: {
            ...DEFAULT_SETTINGS.shortcuts,
            ...loadedSettings.shortcuts,
          },
        };
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }

    // 如果加载失败或文件不存在，返回默认设置
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * 保存设置
   */
  private saveSettings(): void {
    try {
      const data = JSON.stringify(this.settings, null, 2);
      fs.writeFileSync(this.settingsFilePath, data, 'utf8');
    } catch (error) {
      console.error('保存设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前设置
   */
  getSettings(): UserSettings {
    return { ...this.settings };
  }

  /**
   * 更新设置
   */
  updateSettings(updates: Partial<UserSettings>): void {
    this.settings = {
      ...this.settings,
      ...updates,
    };

    // 如果更新了嵌套对象，需要深度合并
    if (updates.enginePaths) {
      this.settings.enginePaths = {
        ...this.settings.enginePaths,
        ...updates.enginePaths,
      };
    }

    if (updates.shortcuts) {
      this.settings.shortcuts = {
        ...this.settings.shortcuts,
        ...updates.shortcuts,
      };
    }

    // 如果更新了 defaultBoardSize，同步更新 boardSize
    if (updates.defaultBoardSize !== undefined) {
      this.settings.boardSize = updates.defaultBoardSize;
    }
    
    // 如果更新了 boardSize，同步更新 defaultBoardSize
    if (updates.boardSize !== undefined) {
      this.settings.defaultBoardSize = updates.boardSize;
    }

    this.saveSettings();
  }

  /**
   * 重置为默认设置
   */
  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }

  /**
   * 获取引擎路径
   */
  getEnginePath(engineType: EngineType): string {
    return this.settings.enginePaths[engineType] || this.pathManager.getDefaultEnginePath(engineType);
  }

  /**
   * 设置引擎路径
   */
  setEnginePath(engineType: EngineType, path: string): void {
    this.settings.enginePaths[engineType] = path;
    this.saveSettings();
  }

  /**
   * 获取默认棋盘大小
   */
  getDefaultBoardSize(): BoardSize {
    return this.settings.defaultBoardSize;
  }

  /**
   * 设置默认棋盘大小
   */
  setDefaultBoardSize(size: BoardSize): void {
    // 同时更新 boardSize 和 defaultBoardSize
    this.settings.boardSize = size;
    this.settings.defaultBoardSize = size;
    this.saveSettings();
  }

  /**
   * 获取默认速度
   */
  getDefaultSpeed(): number {
    return this.settings.defaultSpeed;
  }

  /**
   * 设置默认速度
   */
  setDefaultSpeed(speed: number): void {
    this.settings.defaultSpeed = Math.max(1, Math.min(10, speed));
    this.saveSettings();
  }

  /**
   * 获取默认贴目
   */
  getDefaultKomi(): number {
    return this.settings.defaultKomi;
  }

  /**
   * 设置默认贴目
   */
  setDefaultKomi(komi: number): void {
    this.settings.defaultKomi = komi;
    this.saveSettings();
  }

  /**
   * 获取主题
   */
  getTheme(): 'light' | 'dark' | 'auto' {
    return this.settings.theme;
  }

  /**
   * 设置主题
   */
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.settings.theme = theme;
    this.saveSettings();
  }

  /**
   * 获取语言
   */
  getLanguage(): 'zh' | 'en' | 'ja' {
    return this.settings.language;
  }

  /**
   * 设置语言
   */
  setLanguage(language: 'zh' | 'en' | 'ja'): void {
    this.settings.language = language;
    this.saveSettings();
  }

  /**
   * 获取快捷键
   */
  getShortcut(action: string): string | undefined {
    return this.settings.shortcuts[action];
  }

  /**
   * 设置快捷键
   */
  setShortcut(action: string, shortcut: string): void {
    this.settings.shortcuts[action] = shortcut;
    this.saveSettings();
  }

  /**
   * 获取默认黑棋AI配置
   */
  getDefaultAIBlack(): AIProfile {
    const enginePath = this.getEnginePath('mock');
    return {
      ...DEFAULT_AI_BLACK,
      enginePath,
    };
  }

  /**
   * 获取默认白棋AI配置
   */
  getDefaultAIWhite(): AIProfile {
    const enginePath = this.getEnginePath('mock');
    return {
      ...DEFAULT_AI_WHITE,
      enginePath,
    };
  }

  /**
   * 创建AI配置
   */
  createAIProfile(
    name: string,
    engineType: EngineType,
    strength: number = 5,
    customPath?: string
  ): AIProfile {
    const enginePath = customPath || this.getEnginePath(engineType);
    const available = this.pathManager.engineExists(enginePath);

    return {
      id: `${engineType}-${Date.now()}`,
      name,
      engineType,
      strength: Math.max(1, Math.min(10, strength)),
      enginePath,
      timeSettings: {
        mainTime: 300,
        byoYomi: 30,
        byoYomiPeriods: 3,
      },
      description: `${name} - 棋力${strength}`,
      available,
    };
  }

  /**
   * 检查引擎是否可用
   */
  isEngineAvailable(engineType: EngineType): boolean {
    if (engineType === 'mock') {
      return true;
    }

    const enginePath = this.getEnginePath(engineType);
    return this.pathManager.engineExists(enginePath);
  }

  /**
   * 获取所有可用的引擎
   */
  getAvailableEngines(): EngineType[] {
    const engines: EngineType[] = ['mock']; // Mock引擎总是可用

    const engineTypes: EngineType[] = ['gnugo', 'katago', 'leela', 'pachi'];
    for (const engineType of engineTypes) {
      if (this.isEngineAvailable(engineType)) {
        engines.push(engineType);
      }
    }

    return engines;
  }

  /**
   * 获取 KataGo 模型文件路径
   */
  getKataGoModelPath(): string {
    return this.settings.katagoModelPath || '';
  }

  /**
   * 设置 KataGo 模型文件路径
   */
  setKataGoModelPath(path: string): void {
    this.settings.katagoModelPath = path;
    this.saveSettings();
  }

  /**
   * 获取 KataGo 配置文件路径
   */
  getKataGoConfigPath(): string {
    return this.settings.katagoConfigPath || '';
  }

  /**
   * 设置 KataGo 配置文件路径
   */
  setKataGoConfigPath(path: string): void {
    this.settings.katagoConfigPath = path;
    this.saveSettings();
  }

  /**
   * 导出设置为JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * 从JSON导入设置
   */
  importSettings(json: string): void {
    try {
      const importedSettings = JSON.parse(json);
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...importedSettings,
      };
      this.saveSettings();
    } catch (error) {
      console.error('导入设置失败:', error);
      throw new Error('无效的设置文件格式');
    }
  }
}
