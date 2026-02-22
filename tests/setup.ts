import '@testing-library/jest-dom';

// Mock window.electronAPI
(global.window as any).electronAPI = {
  // Settings
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  
  // Game control
  startGame: jest.fn(),
  pauseGame: jest.fn(),
  resumeGame: jest.fn(),
  stopGame: jest.fn(),
  makeMove: jest.fn(),
  
  // SGF operations
  importSGF: jest.fn(),
  exportSGF: jest.fn(),
  saveGame: jest.fn(),
  
  // Event listeners
  onGameStateUpdate: jest.fn(),
  onMoveUpdate: jest.fn(),
  onGameEnd: jest.fn(),
  onError: jest.fn(),
  
  // Window controls
  minimizeWindow: jest.fn(),
  maximizeWindow: jest.fn(),
  closeWindow: jest.fn(),
};
