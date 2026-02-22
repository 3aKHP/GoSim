/**
 * UI状态管理
 * 使用 Zustand 管理UI状态
 */

import { create } from 'zustand';

interface UIStore {
  // 侧边栏状态
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarTab: 'control' | 'settings' | 'history';
  
  // 对话框状态
  showNewGameDialog: boolean;
  showSettingsDialog: boolean;
  showAboutDialog: boolean;
  showGameEndDialog: boolean;
  
  // 棋盘显示选项
  showCoordinates: boolean;
  showMoveNumbers: boolean;
  showLastMove: boolean;
  
  // 悬停状态
  hoveredPoint: { x: number; y: number } | null;
  hoverPosition: { x: number; y: number } | null;
  
  // 操作方法
  toggleSidebar: () => void;
  setSidebarTab: (tab: 'control' | 'settings' | 'history') => void;
  
  setShowNewGameDialog: (show: boolean) => void;
  setShowSettingsDialog: (show: boolean) => void;
  setShowAboutDialog: (show: boolean) => void;
  setShowGameEndDialog: (show: boolean) => void;
  
  setShowCoordinates: (show: boolean) => void;
  setShowMoveNumbers: (show: boolean) => void;
  setShowLastMove: (show: boolean) => void;
  
  setHoveredPoint: (point: { x: number; y: number } | null) => void;
  setHoverPosition: (position: { x: number; y: number } | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // 初始状态
  sidebarOpen: true,
  sidebarCollapsed: false,
  sidebarTab: 'control',
  
  showNewGameDialog: false,
  showSettingsDialog: false,
  showAboutDialog: false,
  showGameEndDialog: false,
  
  showCoordinates: true,
  showMoveNumbers: false,
  showLastMove: true,
  
  hoveredPoint: null,
  hoverPosition: null,
  
  // 侧边栏操作
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen, sidebarCollapsed: !state.sidebarCollapsed }));
  },
  
  setSidebarTab: (tab) => {
    set({ sidebarTab: tab });
  },
  
  // 对话框操作
  setShowNewGameDialog: (show) => {
    set({ showNewGameDialog: show });
  },
  
  setShowSettingsDialog: (show) => {
    set({ showSettingsDialog: show });
  },
  
  setShowAboutDialog: (show) => {
    set({ showAboutDialog: show });
  },
  
  setShowGameEndDialog: (show) => {
    set({ showGameEndDialog: show });
  },
  
  // 显示选项操作
  setShowCoordinates: (show) => {
    set({ showCoordinates: show });
  },
  
  setShowMoveNumbers: (show) => {
    set({ showMoveNumbers: show });
  },
  
  setShowLastMove: (show) => {
    set({ showLastMove: show });
  },
  
  // 悬停状态
  setHoveredPoint: (point) => {
    set({ hoveredPoint: point });
  },
  
  setHoverPosition: (position) => {
    set({ hoverPosition: position });
  },
}));
