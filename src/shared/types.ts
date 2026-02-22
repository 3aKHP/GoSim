/**
 * 围棋模拟器核心类型定义
 */

// 棋盘相关类型
export type StoneColor = 'black' | 'white' | 'empty';
export type BoardSize = 9 | 13 | 19;
export type GameStatus = 'idle' | 'configuring' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';

// 坐标系统
export interface Coordinate {
  x: number; // 0-based 列索引
  y: number; // 0-based 行索引
}

// 着法记录
export interface Move {
  color: 'black' | 'white';
  coordinate: Coordinate;
  gtpCoordinate: string; // 如 "Q16"
  timestamp: number;
  moveNumber: number;
  captured?: number;
  comment?: string;
}

// AI引擎类型
export type EngineType = 'gnugo' | 'katago' | 'leela' | 'pachi' | 'mock' | 'custom';

export interface AIProfile {
  id: string;
  name: string;
  engineType: EngineType;
  strength: number; // 1-10
  enginePath: string;
  modelPath?: string;   // KataGo 权重文件路径
  configPath?: string;  // KataGo GTP配置文件路径
  timeSettings?: {
    mainTime: number; // 秒
    byoYomi: number; // 读秒时间
    byoYomiPeriods: number; // 读秒次数
  };
  description?: string;
  available: boolean;
}

// 游戏状态
export interface GameState {
  // 棋盘状态
  boardSize: BoardSize;
  board: StoneColor[][];
  moveHistory: Move[];
  currentPlayer: 'black' | 'white';
  moveNumber: number;
  
  // 游戏状态
  gameStatus: GameStatus;
  startTime: number | null;
  endTime: number | null;
  
  // 提子统计
  capturedBlack: number;
  capturedWhite: number;
  
  // AI配置
  aiBlack: AIProfile;
  aiWhite: AIProfile;
  
  // 游戏设置
  speed: number; // 1-10
  komi: number;
  handicap: number;
}

// 游戏配置
export interface GameConfig {
  boardSize?: BoardSize;
  aiBlack?: AIProfile;
  aiWhite?: AIProfile;
  komi?: number;
  handicap?: number;
}

// 着法结果
export interface MoveResult {
  success: boolean;
  move?: Move;
  captured?: Coordinate[];
  error?: string;
}

// 地盘计算结果
export interface TerritoryResult {
  blackTerritory: Coordinate[];
  whiteTerritory: Coordinate[];
  neutralTerritory: Coordinate[];
  deadStones: { coord: Coordinate; color: StoneColor }[];
  blackArea: number;
  whiteArea: number;
  neutralArea: number;
}

// 终盘结果
export interface FinalScore {
  blackScore: number;
  whiteScore: number;
  blackArea: number;
  whiteArea: number;
  blackTerritory: number;
  whiteTerritory: number;
  blackStones: number;
  whiteStones: number;
  deadBlack: number;
  deadWhite: number;
  capturedBlack: number;
  capturedWhite: number;
  komi: number;
  winner: 'black' | 'white' | 'draw';
  winBy: number;
  scoreDiff: number;
}

// 游戏结束结果（终局 IPC 传输用）
export interface GameOverResult {
  winner: 'W' | 'B' | 'Draw';
  score: number | 'Resign';
  raw: string;        // 原始字符串，如 "W+35.5"
  reason: string;     // 人类可读的描述
}

// 游戏统计
export interface GameStatistics {
  totalMoves: number;
  blackTerritory: number;
  whiteTerritory: number;
  blackCaptures: number;
  whiteCaptures: number;
  blackScore: number;
  whiteScore: number;
  winner: 'black' | 'white' | 'draw';
  winBy: number;
  duration: number; // 秒
  moveTimes: {
    black: number[];
    white: number[];
  };
}

// 用户设置
export interface UserSettings {
  // 界面设置
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en' | 'ja';
  showCoordinates: boolean;
  showMoveNumbers: boolean;
  showSuggestedMoves: boolean;
  
  // 游戏默认设置
  boardSize: BoardSize; // 当前棋盘大小
  defaultBoardSize: BoardSize;
  defaultSpeed: number;
  defaultKomi: number;
  defaultHandicap: number;
  defaultAIBlack: AIProfile;
  defaultAIWhite: AIProfile;
  
  // AI引擎路径
  enginePaths: Record<EngineType, string>;
  
  // KataGo 专属路径
  katagoModelPath?: string;   // KataGo 权重文件路径
  katagoConfigPath?: string;  // KataGo GTP配置文件路径
  
  // 快捷键
  shortcuts: Record<string, string>;
  
  // 游戏规则
  allowSuicide: boolean;
  allowKo: boolean;
  autoResign: boolean;
}

// 引擎信息
export interface EngineInfo {
  type: EngineType;
  name: string;
  path: string;
  available: boolean;
  version: string;
}

// 测试结果
export interface TestResult {
  success: boolean;
  message: string;
}

// 更新信息
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl?: string;
}

// 对话框选项
export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate')[];
}

// 消息框选项
export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

// 消息框结果
export interface MessageBoxResult {
  response: number;
  checkboxChecked?: boolean;
}

// 棋盘更新
export interface BoardUpdate {
  board: StoneColor[][];
  lastMove?: Coordinate;
  captured?: Coordinate[];
  moveNumber: number;
}

// 引擎配置
export interface GTPEngineOptions {
  enginePath: string;
  engineType: EngineType;
  args?: string[];
  modelPath?: string;   // KataGo 权重文件路径
  configPath?: string;  // KataGo GTP配置文件路径
  commandTimeout?: number;
  startupTimeout?: number;
  logCommands?: boolean;
  logResponses?: boolean;
  mockStrength?: number;
  mockDelay?: number;
}
