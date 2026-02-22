/**
 * 游戏状态管理
 * 使用 Zustand 管理游戏状态
 */

import { create } from 'zustand';
import { GameState, GameOverResult, AIProfile, BoardSize } from '../../shared/types';

interface GameStore {
  // 游戏状态
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  
  // 终局结果
  gameResult: GameOverResult | null;
  
  // 胜率历史（每手落子后记录一次）
  winrateHistory: number[];
  currentWinrate: number | null;
  
  // 取消订阅函数数组（修复内存泄漏）
  unsubscribers: (() => void)[];

  // 操作方法
  setGameState: (state: GameState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setGameResult: (result: GameOverResult | null) => void;
  clearGameResult: () => void;
  pushWinrate: (winrate: number) => void;
  
  // 游戏控制
  startGame: (
    boardSize: BoardSize,
    aiBlack: AIProfile,
    aiWhite: AIProfile,
    komi: number,
    handicap: number
  ) => Promise<void>;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;
  stopGame: () => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  
  // 订阅游戏更新
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // 初始状态
  gameState: null,
  isLoading: false,
  error: null,
  gameResult: null,
  winrateHistory: [],
  currentWinrate: null,
  unsubscribers: [],

  // 设置游戏状态
  setGameState: (state: GameState) => {
    set({ gameState: state, error: null });
  },

  // 设置加载状态
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  // 设置错误
  setError: (error: string | null) => {
    set({ error });
  },

  // 设置终局结果
  setGameResult: (result: GameOverResult | null) => {
    set({ gameResult: result });
  },

  // 清除终局结果（关闭弹窗时调用）
  clearGameResult: () => {
    set({ gameResult: null });
  },

  // 将当前胜率追加到历史记录
  pushWinrate: (winrate: number) => {
    const { winrateHistory } = get();
    set({ winrateHistory: [...winrateHistory, winrate] });
  },

  // 开始新游戏
  startGame: async (
    boardSize: BoardSize,
    aiBlack: AIProfile,
    aiWhite: AIProfile,
    komi: number,
    handicap: number
  ) => {
    try {
      set({ isLoading: true, error: null });

      // 清除上一局的结果和胜率历史
      set({ gameResult: null, winrateHistory: [], currentWinrate: null });

      // 调用 Electron API 启动游戏
      await window.electronAPI.startGame(boardSize, aiBlack, aiWhite, komi, handicap);

      // 订阅游戏更新
      get().subscribeToUpdates();

      set({ isLoading: false });
    } catch (error: any) {
      console.error('启动游戏失败:', error);
      set({
        isLoading: false,
        error: error.message || '启动游戏失败',
      });
    }
  },

  // 暂停游戏
  pauseGame: async () => {
    try {
      await window.electronAPI.pauseGame();
    } catch (error: any) {
      console.error('暂停游戏失败:', error);
      set({ error: error.message || '暂停游戏失败' });
    }
  },

  // 恢复游戏
  resumeGame: async () => {
    try {
      await window.electronAPI.resumeGame();
    } catch (error: any) {
      console.error('恢复游戏失败:', error);
      set({ error: error.message || '恢复游戏失败' });
    }
  },

  // 停止游戏
  stopGame: async () => {
    try {
      await window.electronAPI.stopGame();
      
      // 取消订阅
      get().unsubscribeFromUpdates();
      
      set({ gameState: null });
    } catch (error: any) {
      console.error('停止游戏失败:', error);
      set({ error: error.message || '停止游戏失败' });
    }
  },

  // 设置游戏速度
  setSpeed: async (speed: number) => {
    try {
      await window.electronAPI.setSpeed(speed);
    } catch (error: any) {
      console.error('设置速度失败:', error);
      set({ error: error.message || '设置速度失败' });
    }
  },

  // 订阅游戏更新
  subscribeToUpdates: () => {
    // 取消之前的订阅
    get().unsubscribeFromUpdates();

    const unsubscribers: (() => void)[] = [];

    // 订阅游戏状态更新
    const unsubStateUpdate = window.electronAPI.onGameStateUpdate((state: GameState) => {
      set({ gameState: state });
    });
    unsubscribers.push(unsubStateUpdate);

    // 订阅着法事件
    const unsubMove = window.electronAPI.onMove((move) => {
      console.log('着法:', move);
    });
    unsubscribers.push(unsubMove);

    // 订阅引擎分析数据更新：每次收到数据直接追加到历史
    const unsubAnalyze = window.electronAPI.onAnalyzeUpdate((data: { winrate: number; scorelead: number }) => {
      set({ currentWinrate: data.winrate });
      get().pushWinrate(data.winrate);
    });
    unsubscribers.push(unsubAnalyze);

    // 订阅游戏结束事件
    const unsubGameEnd = window.electronAPI.onGameEnd((result) => {
      console.log('游戏结束:', result);
    });
    unsubscribers.push(unsubGameEnd);

    // 订阅结构化游戏结束事件
    const unsubGameOver = window.electronAPI.onGameOver((result: GameOverResult) => {
      console.log('游戏结束（结构化）:', result);
      set({ gameResult: result });
    });
    unsubscribers.push(unsubGameOver);

    // 订阅错误事件
    const unsubError = window.electronAPI.onError((error) => {
      console.error('游戏错误:', error);
      set({ error: error.message });
    });
    unsubscribers.push(unsubError);

    // 将所有取消订阅函数存储到 Store 中
    set({ unsubscribers });
  },

  // 取消订阅
  unsubscribeFromUpdates: () => {
    const { unsubscribers } = get();
    // 遍历调用所有取消订阅函数
    unsubscribers.forEach(unsub => unsub());
    // 清空数组
    set({ unsubscribers: [] });
  },
}));
