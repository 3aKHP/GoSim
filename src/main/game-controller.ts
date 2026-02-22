import { GameState, GameOverResult, AIProfile, BoardSize, StoneColor, Move, Coordinate } from '../shared/types';
import { Board } from './utils/board';
import { GameRules } from './utils/game-rules';
import { GTPEngine, AnalyzeData } from './gtp/engine';
import { PathManager } from './utils/path-manager';
import { gtpCoordinateToArray, coordinateToGTP as utilsCoordinateToGTP, getHandicapPositions as utilsGetHandicapPositions } from './utils/coordinate';
import { getGameLogger, resetGameLogger } from './utils/game-logger';

export class GameController {
  private gameState: GameState;
  private board: Board;
  private rules: GameRules;
  private pathManager: PathManager;
  
  private blackEngine: GTPEngine | null = null;
  private whiteEngine: GTPEngine | null = null;
  
  private gameTimer: NodeJS.Timeout | null = null;
  private moveTimer: NodeJS.Timeout | null = null;
  private speed: number = 5;
  
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private consecutivePassCount: number = 0;
  
  // 事件回调
  private stateUpdateCallback: ((state: GameState) => void) | null = null;
  private moveCallback: ((move: { color: StoneColor; position: Coordinate; moveNumber: number }) => void) | null = null;
  private gameEndCallback: ((result: { winner: StoneColor | 'draw'; score: string; reason: string }) => void) | null = null;
  private errorCallback: ((error: { message: string; details?: string }) => void) | null = null;
  private gameOverCallback: ((result: GameOverResult) => void) | null = null;
  private analyzeUpdateCallback: ((data: AnalyzeData) => void) | null = null;
  
  constructor(
    initialBoardSize: BoardSize = 19,
    initialAIBlack: AIProfile,
    initialAIWhite: AIProfile,
    pathManager: PathManager
  ) {
    this.pathManager = pathManager;
    this.board = new Board(initialBoardSize);
    this.rules = new GameRules(this.board);
    
    this.gameState = {
      boardSize: initialBoardSize,
      board: this.board.getGrid(),
      moveHistory: [],
      currentPlayer: 'black',
      moveNumber: 0,
      gameStatus: 'idle',
      startTime: null,
      endTime: null,
      capturedBlack: 0,
      capturedWhite: 0,
      aiBlack: initialAIBlack,
      aiWhite: initialAIWhite,
      speed: this.speed,
      komi: 6.5,
      handicap: 0
    };
  }
  
  // 开始新游戏
  async startNewGame(config?: {
    boardSize?: BoardSize;
    aiBlack?: AIProfile;
    aiWhite?: AIProfile;
    komi?: number;
    handicap?: number;
  }): Promise<GameState> {
    // 停止当前游戏
    this.stopGame();
    
    // 状态重置：强制重新实例化棋盘
    if (config?.boardSize) {
      // 强制重新实例化 Board，确保后端棋盘数据结构正确
      this.board = new Board(config.boardSize);
      this.rules = new GameRules(this.board);
      this.gameState.boardSize = config.boardSize;
    } else {
      // 如果没有指定新大小，只重置当前棋盘
      this.board.reset();
    }
    
    if (config?.aiBlack) {
      this.gameState.aiBlack = config.aiBlack;
    }
    
    if (config?.aiWhite) {
      this.gameState.aiWhite = config.aiWhite;
    }
    
    if (config?.komi !== undefined) {
      this.gameState.komi = config.komi;
    } else {
      // 默认贴目逻辑：19路 7.5，9路和13路 5.5
      const size = config?.boardSize || this.gameState.boardSize;
      this.gameState.komi = size === 19 ? 7.5 : 5.5;
    }
    
    if (config?.handicap !== undefined) {
      this.gameState.handicap = config.handicap;
    }
    
    // 重置游戏状态
    this.gameState.board = this.board.getGrid();
    this.gameState.moveHistory = [];
    this.gameState.currentPlayer = 'black';
    this.gameState.moveNumber = 0;
    this.gameState.capturedBlack = 0;
    this.gameState.capturedWhite = 0;
    this.consecutivePassCount = 0;
    this.gameState.startTime = Date.now();
    this.gameState.endTime = null;
    this.gameState.gameStatus = 'configuring';
    
    try {
      // 启动AI引擎（会自动发送 boardsize 命令）
      await this.startAIEngines();
      
      // 设置让子
      if (this.gameState.handicap > 0) {
        await this.setupHandicap();
      }
      
      // 更新游戏状态
      this.gameState.gameStatus = 'ready';
      this.isRunning = true;
      this.isPaused = false;
      
      // 前端同步：通过 emitStateUpdate 推送给前端
      this.emitStateUpdate();
      
      // 初始化游戏日志
      const logger = resetGameLogger();
      logger.gameStart(
        this.gameState.boardSize,
        this.gameState.komi,
        this.gameState.aiBlack.engineType,
        this.gameState.aiWhite.engineType
      );

      // 开始游戏循环
      this.startGameLoop();
      
      return this.gameState;
    } catch (error) {
      this.gameState.gameStatus = 'error';
      throw error;
    }
  }
  
  // 解析引擎实际路径：优先使用 AIProfile 中的路径，为空则回退到 PathManager 默认路径
  private resolveEnginePath(profile: AIProfile): string {
    if (profile.enginePath && profile.enginePath !== '') {
      return profile.enginePath;
    }
    return this.pathManager.getDefaultEnginePath(profile.engineType);
  }

  // 启动AI引擎
  private async startAIEngines(): Promise<void> {
    // 停止现有引擎
    await this.stopAIEngines();
    
    const { aiBlack, aiWhite, boardSize } = this.gameState;
    
    // 解析实际引擎路径
    const blackEnginePath = this.resolveEnginePath(aiBlack);
    const whiteEnginePath = this.resolveEnginePath(aiWhite);
    
    // 启动黑棋引擎
    this.blackEngine = new GTPEngine({
      enginePath: blackEnginePath,
      engineType: aiBlack.engineType,
      args: this.getEngineArgs(aiBlack)
    });
    
    await this.blackEngine.start(blackEnginePath, boardSize);
    await this.configureEngine(this.blackEngine, aiBlack);
    
    // 启动白棋引擎
    this.whiteEngine = new GTPEngine({
      enginePath: whiteEnginePath,
      engineType: aiWhite.engineType,
      args: this.getEngineArgs(aiWhite)
    });
    
    await this.whiteEngine.start(whiteEnginePath, boardSize);
    await this.configureEngine(this.whiteEngine, aiWhite);
  }
  
  // 配置引擎参数：严格按 boardsize → clear_board → komi 顺序发送
  private async configureEngine(engine: GTPEngine, profile: AIProfile): Promise<void> {
    await engine.setBoardSize(this.gameState.boardSize);
    await engine.clearBoard();
    await engine.setKomi(this.gameState.komi);
    
    if (profile.strength) {
      await engine.setLevel(profile.strength);
    }
    
    // 设置时间控制
    if (profile.timeSettings) {
      await engine.sendCommand(
        `time_settings ${profile.timeSettings.mainTime} ${profile.timeSettings.byoYomi} ${profile.timeSettings.byoYomiPeriods}`
      );
    }
  }
  
  // 获取引擎参数
  private getEngineArgs(profile: AIProfile): string[] {
    const args: string[] = [];
    
    switch (profile.engineType) {
      case 'gnugo':
        args.push('--mode', 'gtp');
        args.push('--level', profile.strength.toString());
        break;
        
      case 'katago':
        // 优先使用 AIProfile 中的 modelPath 和 configPath
        // 如果未设置，则回退到 engines/katago 目录下的默认文件
        const katagoDir = this.pathManager.joinPaths(
          this.pathManager.getEnginesPath(),
          'katago'
        );
        const configPath = profile.configPath || this.pathManager.joinPaths(katagoDir, 'katago.cfg');
        const modelPath = profile.modelPath || this.pathManager.joinPaths(katagoDir, 'model.bin.gz');
        
        args.push('gtp');
        args.push('-config', configPath);
        args.push('-model', modelPath);
        break;
        
      case 'pachi':
        // Pachi 引擎参数
        // 禁用 DCNN（深度神经网络），使用传统 MCTS 算法
        args.push('--nodcnn');
        
        // 禁用 joseki 模块（定式库），避免缺少 joseki19.gtp 文件的错误
        args.push('--nojoseki');
        
        // 根据强度设置时间控制
        const strength = profile.strength || 5;
        
        // 根据强度设置固定模拟次数
        // 使用 =SIMS 格式：固定模拟次数
        const sims = this.strengthToPlayouts(strength);
        args.push(`-t`, `=${sims}`);
        
        // 设置线程数
        const threads = strength >= 7 ? 4 : strength >= 4 ? 2 : 1;
        args.push(`threads=${threads}`);
        
        // 设置认输阈值
        args.push(`resign_threshold=0.20`);
        break;
        
      default:
        // 其他引擎使用默认 GTP 模式
        args.push('--mode', 'gtp');
        break;
    }
    
    return args;
  }
  
  // 将强度映射到 Pachi 的 playouts
  private strengthToPlayouts(strength: number): number {
    const clampedStrength = Math.max(1, Math.min(10, strength));
    
    const playoutsMap: Record<number, number> = {
      1: 1000,
      2: 3000,
      3: 5000,
      4: 10000,
      5: 20000,
      6: 50000,
      7: 100000,
      8: 200000,
      9: 500000,
      10: 1000000,
    };
    
    return playoutsMap[clampedStrength];
  }
  
  
  // 设置让子
  private async setupHandicap(): Promise<void> {
    const handicap = Math.min(this.gameState.handicap, 9);
    const size = this.gameSize;
    
    // 标准让子位置
    const handicapPositions = utilsGetHandicapPositions(handicap, size as BoardSize);
    
    // 在棋盘上放置让子
    for (const coord of handicapPositions) {
      this.board.placeStone('black', coord.x, coord.y);
    }
    
    // 更新游戏状态
    this.gameState.board = this.board.getGrid();
    
    // 通知引擎
    if (this.blackEngine) {
      for (const coord of handicapPositions) {
        const gtpCoord = this.coordinateToGTP(coord);
        await this.blackEngine.play('black', gtpCoord);
      }
    }
    
    if (this.whiteEngine) {
      for (const coord of handicapPositions) {
        const gtpCoord = this.coordinateToGTP(coord);
        await this.whiteEngine.play('black', gtpCoord);
      }
    }
    this.gameState.currentPlayer = 'white'; 
  }
  
  
  // 开始游戏循环
  private startGameLoop(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    // 清除现有定时器
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
    }
    
    // 调度下一着法
    const delay = this.calculateMoveDelay();
    this.moveTimer = setTimeout(() => {
      this.playNextMove();
    }, delay);
  }
  
  // 计算着法延迟
  private calculateMoveDelay(): number {
    // 速度1-10对应延迟2000ms-200ms
    const minDelay = 200;
    const maxDelay = 2000;
    const speedFactor = (11 - this.speed) / 10;
    
    return minDelay + (maxDelay - minDelay) * speedFactor;
  }
  
  // 执行下一着法
  private async playNextMove(): Promise<void> {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    const { currentPlayer } = this.gameState;
    const engine = currentPlayer === 'black' ? this.blackEngine : this.whiteEngine;
    
    if (!engine) {
      this.handleError(new Error(`${currentPlayer}引擎未找到`));
      return;
    }
    
    try {
      // 请求AI生成着法
      const moveStr = await engine.genmove(currentPlayer);

      // 处理着法结果
      await this.processMoveResult(currentPlayer, moveStr);
      
      // genmove 已通过 kata-genmove_analyze 解析了胜率，直接读取并推送
      this.emitWinrateAfterMove(engine);
      
      // 切换玩家
      this.gameState.currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
      this.gameState.moveNumber++;
      
      // 检查游戏是否结束
      if (this.shouldEndGame(moveStr)) {
        await this.endGame();
      } else {
        // 继续游戏循环
        this.startGameLoop();
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }
  
  // 处理着法结果
  private async processMoveResult(player: 'black' | 'white', moveStr: string): Promise<void> {
    if (moveStr === 'resign') {
      // 认输
      this.gameState.gameStatus = 'finished';
      this.emitGameEnd(player === 'black' ? 'white' : 'black', '', '对方认输');
      return;
    }
    
    if (moveStr === 'pass') {
      // 停着：递增连续 pass 计数器
      this.consecutivePassCount++;
      
      const move: Move = {
        color: player,
        coordinate: { x: -1, y: -1 },
        gtpCoordinate: 'pass',
        timestamp: Date.now(),
        moveNumber: this.gameState.moveNumber + 1
      };
      
      this.gameState.moveHistory.push(move);
      
      // 同步给对手引擎
      const opponentEngine = player === 'black' ? this.whiteEngine : this.blackEngine;
      if (opponentEngine) {
        await opponentEngine.play(player, 'pass');
      }

      this.emitStateUpdate();
      return;
    }
    
    // 正常着法：重置连续 pass 计数器
    this.consecutivePassCount = 0;
    const coord = this.parseGTPCoordinate(moveStr);
    
    // 执行着法
    const result = this.rules.playMove(coord.x, coord.y, player);
    
    if (!result.success) {
      throw new Error(`着法执行失败: ${result.error}`);
    }
    
    // 更新游戏状态
    this.gameState.board = this.board.getGrid();
    this.gameState.moveHistory.push(result.move!);
    
    // 更新提子统计
    const captures = this.board.getCaptures();
    this.gameState.capturedBlack = captures.black;
    this.gameState.capturedWhite = captures.white;
    
    // 触发着法事件
    this.emitMove(player, coord, result.move!.moveNumber);
    
    // 触发状态更新
    this.emitStateUpdate();
    
    // 在对手引擎上同步落子
    const opponentEngine = player === 'black' ? this.whiteEngine : this.blackEngine;
    if (opponentEngine) {
      await opponentEngine.play(player, moveStr);
    }

  }
  
  // 解析GTP坐标
  private parseGTPCoordinate(gtpCoord: string): Coordinate {
    return gtpCoordinateToArray(gtpCoord, this.gameState.boardSize);
  }
  
  // 坐标转GTP
  private coordinateToGTP(coord: Coordinate): string {
    return utilsCoordinateToGTP(coord, this.gameState.boardSize);
  }
  
  // 判断是否应该结束游戏
  private shouldEndGame(moveStr: string): boolean {
    // 认输
    if (moveStr === 'resign') {
      return true;
    }
    
    // 连续两个 pass（使用计数器）
    if (this.consecutivePassCount >= 2) {
      return true;
    }
    
    return false;
  }
  
  // 解析 GTP final_score 返回值，如 "W+45.5"、"B+3.5"、"0" (和棋)
  private parseFinalScoreResponse(response: string): { winner: 'black' | 'white' | 'draw'; score: string; margin: number } {
    const trimmed = response.trim();
    
    // 和棋
    if (trimmed === '0' || trimmed.toLowerCase() === 'draw') {
      return { winner: 'draw', score: '0', margin: 0 };
    }
    
    // 匹配 "W+45.5" 或 "B+Resign" 等格式
    const match = trimmed.match(/^([BW])\+(.+)$/i);
    if (match) {
      const color = match[1].toUpperCase();
      const detail = match[2];
      const winner: 'black' | 'white' = color === 'B' ? 'black' : 'white';
      
      if (detail.toLowerCase() === 'resign') {
        return { winner, score: `${trimmed}`, margin: 0 };
      }
      
      const margin = parseFloat(detail) || 0;
      return { winner, score: trimmed, margin };
    }
    
    // 无法解析，回退到本地计算
    return { winner: 'draw', score: trimmed, margin: 0 };
  }

  // 结束游戏
  private async endGame(): Promise<void> {
    this.isRunning = false;
    this.gameState.gameStatus = 'finished';
    this.gameState.endTime = Date.now();
    
    // 优先通过 GTP 引擎的 final_score 命令获取胜负结果
    let winner: 'black' | 'white' | 'draw' = 'draw';
    let scoreText = '';
    let reason = '对局结束';
    
    // 检查最后一手是否为认输
    const lastMove = this.gameState.moveHistory[this.gameState.moveHistory.length - 1];
    if (lastMove && lastMove.gtpCoordinate === 'resign') {
      winner = lastMove.color === 'black' ? 'white' : 'black';
      scoreText = `${winner === 'black' ? 'B' : 'W'}+Resign`;
      reason = '对方认输';
    } else {
      // 连续双 pass 触发终局，向引擎请求 final_score（以 KataGo 为准，不使用本地算法）
      const scoringEngine = this.blackEngine || this.whiteEngine;
      if (scoringEngine) {
        try {
          const scoreResponse = await scoringEngine.finalScore();
          const parsed = this.parseFinalScoreResponse(scoreResponse);
          winner = parsed.winner;
          scoreText = parsed.score;
          reason = parsed.margin > 0
            ? `对局结束（${scoreText}，目数差：${parsed.margin.toFixed(1)}）`
            : `对局结束（${scoreText}）`;
        } catch (error) {
          console.warn('GTP final_score 命令失败:', error);
          winner = 'draw';
          scoreText = '无法获取结果';
          reason = '对局结束（引擎计分失败）';
        }
      } else {
        winner = 'draw';
        scoreText = '无法获取结果';
        reason = '对局结束（无可用引擎）';
      }
    }
    
    // 触发游戏结束回调（旧格式，保持兼容）
    if (this.gameEndCallback) {
      this.gameEndCallback({ winner, score: scoreText, reason });
    }
    
    // 触发 GameOverResult 回调（结构化格式）
    if (this.gameOverCallback) {
      const winnerCode: 'W' | 'B' | 'Draw' = winner === 'white' ? 'W' : winner === 'black' ? 'B' : 'Draw';
      const scoreValue: number | 'Resign' = scoreText.toLowerCase().includes('resign')
        ? 'Resign'
        : (parseFloat(scoreText.replace(/^[BW]\+/, '')) || 0);
      this.gameOverCallback({
        winner: winnerCode,
        score: scoreValue,
        raw: scoreText,
        reason,
      });
    }

    // 停止引擎
    await this.stopAIEngines();
    
    // 清除定时器
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }

    this.emitStateUpdate();
  }
  
  // 停止游戏
  private stopGame(): void {
    this.isRunning = false;
    
    // 清除定时器
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
    
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }
  
  // 停止AI引擎
  private async stopAIEngines(): Promise<void> {
    const stopPromises: Promise<void>[] = [];
    
    if (this.blackEngine) {
      stopPromises.push(this.blackEngine.quit().catch(() => {}));
      this.blackEngine = null;
    }
    
    if (this.whiteEngine) {
      stopPromises.push(this.whiteEngine.quit().catch(() => {}));
      this.whiteEngine = null;
    }
    
    await Promise.all(stopPromises);
  }
  
  // 暂停游戏
  pause(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    this.isPaused = true;
    
    // 清除定时器
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
  }
  
  // 继续游戏
  resume(): void {
    if (!this.isRunning || !this.isPaused) {
      return;
    }
    
    this.isPaused = false;
    this.startGameLoop();
  }
  
  // 改变游戏速度
  changeSpeed(newSpeed: number): void {
    if (newSpeed < 1 || newSpeed > 10) {
      throw new Error('速度必须在1-10之间');
    }
    
    this.speed = newSpeed;
    this.gameState.speed = newSpeed;
    
    // 如果游戏正在进行，重新调度定时器
    if (this.isRunning && !this.isPaused && this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.startGameLoop();
    }
  }
  
  // 改变棋盘大小
    // 改变棋盘大小
  async changeBoardSize(newSize: BoardSize): Promise<void> {
    if (this.isRunning && !this.isPaused) {
      throw new Error('游戏进行中不能改变棋盘大小');
    }
    
    // 1. 重置后端逻辑对象
    this.board = new Board(newSize); // <--- 关键：这里也要重新 new Board，不能只 resize
    this.rules = new GameRules(this.board); // <--- 关键：规则也要重新绑定
    
    // 2. 更新状态数据
    this.gameState.boardSize = newSize;
    this.gameState.board = this.board.getGrid();
    this.gameState.moveHistory = []; // 切换大小应清空历史
    this.gameState.moveNumber = 0;
    this.gameState.capturedBlack = 0;
    this.gameState.capturedWhite = 0;
    
    // 3. 更新引擎配置 (如果引擎已加载)
    if (this.blackEngine) {
      await this.blackEngine.setBoardSize(newSize);
    }
    
    if (this.whiteEngine) {
      await this.whiteEngine.setBoardSize(newSize);
    }

    // 4. 【核心修复】通知前端更新 UI！
    // 之前就是少了这一行，导致前端不知道棋盘变了
    this.emitStateUpdate();
  }

  
  // 获取游戏状态
  getGameState(): GameState {
    return { ...this.gameState };
  }
  
  // 处理错误
  private handleError(error: Error): void {
    console.error('游戏控制器错误:', error);
    getGameLogger().error('GAME', `控制器错误: ${error.message}\n${error.stack || ''}`);
    this.gameState.gameStatus = 'error';
    
    // 触发错误回调
    if (this.errorCallback) {
      this.errorCallback({
        message: error.message,
        details: error.stack,
      });
    }
    
    // 停止游戏
    this.stopGame();
  }
  
  // 获取棋盘大小
  private get gameSize(): number {
    return this.gameState.boardSize;
  }
  
  // 设置状态更新回调
  onStateUpdate(callback: (state: GameState) => void): void {
    this.stateUpdateCallback = callback;
  }
  
  // 设置着法回调
  onMove(callback: (move: { color: StoneColor; position: Coordinate; moveNumber: number }) => void): void {
    this.moveCallback = callback;
  }
  
  // 设置游戏结束回调
  onGameEnd(callback: (result: { winner: StoneColor | 'draw'; score: string; reason: string }) => void): void {
    this.gameEndCallback = callback;
  }
  
  // 设置错误回调
  onError(callback: (error: { message: string; details?: string }) => void): void {
    this.errorCallback = callback;
  }
  
  // 设置游戏结束回调（结构化 GameOverResult 格式）
  onGameOver(callback: (result: GameOverResult) => void): void {
    this.gameOverCallback = callback;
  }
  
  // 设置分析数据更新回调
  onAnalyzeUpdate(callback: (data: AnalyzeData) => void): void {
    this.analyzeUpdateCallback = callback;
  }
  
  // 触发状态更新
  private emitStateUpdate(): void {
    if (this.stateUpdateCallback) {
      this.stateUpdateCallback(this.getGameState());
    }
  }
  
  // 触发着法事件
  private emitMove(color: StoneColor, position: Coordinate, moveNumber: number): void {
    if (this.moveCallback) {
      this.moveCallback({ color, position, moveNumber });
    }
  }
  
  // 每次落子后推送胜率（kata-genmove_analyze 已在 genmove 期间解析了 winrate）
  // 由于 KataGo 配置了 reportAnalysisWinratesAs=BLACK，winrate 已经是黑方视角
  private emitWinrateAfterMove(engine: GTPEngine): void {
    if (!this.analyzeUpdateCallback) return;

    const blackWinrate = engine.lastParsedWinrate;
    getGameLogger().move(
      this.gameState.moveNumber,
      this.gameState.currentPlayer,
      this.gameState.moveHistory.length > 0
        ? this.gameState.moveHistory[this.gameState.moveHistory.length - 1].gtpCoordinate
        : '?',
      blackWinrate
    );
    this.analyzeUpdateCallback({ winrate: blackWinrate, scorelead: 0 });
  }

  // 触发游戏结束事件
  private emitGameEnd(winner: StoneColor | 'draw', score: string, reason: string): void {
    getGameLogger().gameEnd(winner, score, reason);
    if (this.gameEndCallback) {
      this.gameEndCallback({ winner, score, reason });
    }
  }
  
  // 关闭应用
  shutdown(): void {
    this.stopGame();
    this.stopAIEngines().catch(() => {});
  }
}