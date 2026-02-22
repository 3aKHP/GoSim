/**
 * 设置状态管理
 * 使用 Zustand 管理用户设置
 */

import { create } from 'zustand';
import { UserSettings, AIProfile, BoardSize } from '../../shared/types';

interface SettingsStore {
  // 设置状态
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateBoardSize: (size: BoardSize) => Promise<void>;
  updateAIProfile: (color: 'black' | 'white', profile: AIProfile) => Promise<void>;
  updateKomi: (komi: number) => Promise<void>;
  updateHandicap: (handicap: number) => Promise<void>;
  updateSpeed: (speed: number) => Promise<void>;
  updateEnginePath: (engineType: string, path: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // 初始状态
  settings: null,
  isLoading: false,
  error: null,

  // 加载设置
  loadSettings: async () => {
    try {
      set({ isLoading: true, error: null });

      const settings = await window.electronAPI.getSettings();
      
      set({
        settings,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('加载设置失败:', error);
      set({
        isLoading: false,
        error: error.message || '加载设置失败',
      });
    }
  },

  // 保存设置
  saveSettings: async (newSettings: Partial<UserSettings>) => {
    try {
      set({ isLoading: true, error: null });

      const currentSettings = get().settings;
      if (!currentSettings) {
        throw new Error('当前设置未加载');
      }

      const updatedSettings = {
        ...currentSettings,
        ...newSettings,
      };

      await window.electronAPI.saveSettings(updatedSettings);

      set({
        settings: updatedSettings,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('保存设置失败:', error);
      set({
        isLoading: false,
        error: error.message || '保存设置失败',
      });
    }
  },

  // 更新棋盘大小
  updateBoardSize: async (size: BoardSize) => {
    // 同时更新 boardSize 和 defaultBoardSize，确保前端立即生效
    await get().saveSettings({
      boardSize: size,
      defaultBoardSize: size
    });
  },

  // 更新AI配置
  updateAIProfile: async (color: 'black' | 'white', profile: AIProfile) => {
    const key = color === 'black' ? 'defaultAIBlack' : 'defaultAIWhite';
    await get().saveSettings({ [key]: profile });
  },

  // 更新贴目
  updateKomi: async (komi: number) => {
    await get().saveSettings({ defaultKomi: komi });
  },

  // 更新让子数
  updateHandicap: async (handicap: number) => {
    await get().saveSettings({ defaultHandicap: handicap });
  },

  // 更新游戏速度
  updateSpeed: async (speed: number) => {
    await get().saveSettings({ defaultSpeed: speed });
  },

  // 更新引擎路径
  updateEnginePath: async (engineType: string, path: string) => {
    const currentSettings = get().settings;
    if (!currentSettings) {
      throw new Error('当前设置未加载');
    }

    const updatedPaths = {
      ...currentSettings.enginePaths,
      [engineType]: path,
    };

    await get().saveSettings({ enginePaths: updatedPaths });
  },
}));
