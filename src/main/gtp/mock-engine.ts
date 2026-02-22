/**
 * Mock GTP引擎
 * 用于开发和测试，不依赖真实AI引擎
 * 生成随机但合法的着法
 */

import { BoardSize, Coordinate } from '../../shared/types';
import { coordinateToGTP, gtpCoordinateToArray } from '../utils/coordinate';
import { Board } from '../utils/board';
import { GameRules } from '../utils/game-rules';

/**
 * Mock引擎配置
 */
export interface MockEngineOptions {
  strength?: number; // 1-10，影响思考时间和着法质量
  delay?: number; // 固定延迟（毫秒），如果设置则忽略strength
  boardSize?: BoardSize;
  verbose?: boolean; // 是否输出详细日志
}

/**
 * Mock GTP引擎类
 */
export class MockEngine {
  private board: Board;
  private rules: GameRules;
  private strength: number;
  private baseDelay: number;
  private verbose: boolean;
  private isReady: boolean = false;
  private komi: number = 6.5;

  constructor(options: MockEngineOptions = {}) {
    this.strength = options.strength ?? 5;
    this.baseDelay = options.delay ?? this.calculateDelay(this.strength);
    this.verbose = options.verbose ?? false;
    
    const boardSize = options.boardSize ?? 19;
    this.board = new Board(boardSize);
    this.rules = new GameRules(this.board);
  }

  /**
   * 根据棋力计算思考延迟
   */
  private calculateDelay(strength: number): number {
    // 棋力1-10对应延迟100ms-1000ms
    return 100 + (strength - 1) * 100;
  }

  /**
   * 启动引擎
   */
  async start(): Promise<void> {
    this.log('Mock引擎启动');
    this.isReady = true;
    await this.delay(50); // 模拟启动时间
  }

  /**
   * 设置棋盘大小
   */
  async setBoardSize(size: BoardSize): Promise<void> {
    this.log(`设置棋盘大小: ${size}`);
    this.board.resize(size);
    this.rules = new GameRules(this.board);
    await this.delay(10);
  }

  /**
   * 设置贴目
   */
  async setKomi(komi: number): Promise<void> {
    this.log(`设置贴目: ${komi}`);
    this.komi = komi;
    await this.delay(10);
  }

  /**
   * 设置棋力
   */
  async setLevel(level: number): Promise<void> {
    this.log(`设置棋力: ${level}`);
    this.strength = Math.max(1, Math.min(10, level));
    this.baseDelay = this.calculateDelay(this.strength);
    await this.delay(10);
  }

  /**
   * 清空棋盘
   */
  async clearBoard(): Promise<void> {
    this.log('清空棋盘');
    this.board.reset();
    this.rules.reset();
    await this.delay(10);
  }

  /**
   * 在棋盘上落子
   */
  async play(color: 'black' | 'white', move: string): Promise<void> {
    this.log(`落子: ${color} ${move}`);

    if (move.toLowerCase() === 'pass') {
      this.rules.playPass(color);
      await this.delay(10);
      return;
    }

    if (move.toLowerCase() === 'resign') {
      await this.delay(10);
      return;
    }

    const coord = gtpCoordinateToArray(move, this.board.getSize());
    const result = this.rules.playMove(coord.x, coord.y, color);

    if (!result.success) {
      throw new Error(`着法失败: ${result.error}`);
    }

    await this.delay(10);
  }

  /**
   * 生成着法
   */
  async genmove(color: 'black' | 'white'): Promise<string> {
    this.log(`生成着法: ${color}`);

    // 模拟思考时间
    await this.delay(this.baseDelay);

    // 获取所有合法着法
    const legalMoves = this.rules.getLegalMoves(color);

    // 如果没有合法着法，停着
    if (legalMoves.length === 0) {
      this.log('没有合法着法，停着');
      this.rules.playPass(color);
      return 'pass';
    }

    // 根据棋力选择着法
    let selectedMove: Coordinate;

    if (this.strength <= 3) {
      // 低棋力：完全随机
      selectedMove = this.selectRandomMove(legalMoves);
    } else if (this.strength <= 6) {
      // 中棋力：优先考虑能提子的着法
      selectedMove = this.selectMediumMove(legalMoves, color);
    } else {
      // 高棋力：避免填眼，优先提子和重要位置
      selectedMove = this.selectStrongMove(legalMoves, color);
    }

    // 执行着法
    const gtpMove = coordinateToGTP(selectedMove, this.board.getSize());
    const result = this.rules.playMove(selectedMove.x, selectedMove.y, color);

    if (!result.success) {
      // 如果选择的着法失败（理论上不应该发生），随机选择
      this.log(`着法失败，重新选择: ${result.error}`);
      selectedMove = this.selectRandomMove(legalMoves);
      const fallbackMove = coordinateToGTP(selectedMove, this.board.getSize());
      this.rules.playMove(selectedMove.x, selectedMove.y, color);
      return fallbackMove;
    }

    this.log(`生成着法: ${gtpMove}`);
    return gtpMove;
  }

  /**
   * 随机选择着法
   */
  private selectRandomMove(legalMoves: Coordinate[]): Coordinate {
    const index = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[index];
  }

  /**
   * 中等棋力选择着法
   */
  private selectMediumMove(legalMoves: Coordinate[], color: 'black' | 'white'): Coordinate {
    // 优先选择能提子的着法
    const captureMoves = legalMoves.filter((move) => {
      const captureCount = this.rules.countWouldCapture(move.x, move.y, color);
      return captureCount > 0;
    });

    if (captureMoves.length > 0) {
      return this.selectRandomMove(captureMoves);
    }

    // 否则随机选择
    return this.selectRandomMove(legalMoves);
  }

  /**
   * 高棋力选择着法
   */
  private selectStrongMove(legalMoves: Coordinate[], color: 'black' | 'white'): Coordinate {
    // 过滤掉填眼的着法
    const nonEyeMoves = legalMoves.filter((move) => {
      return !this.rules.isEye(move.x, move.y, color);
    });

    const movesToConsider = nonEyeMoves.length > 0 ? nonEyeMoves : legalMoves;

    // 优先选择能提子的着法
    const captureMoves = movesToConsider.filter((move) => {
      const captureCount = this.rules.countWouldCapture(move.x, move.y, color);
      return captureCount > 0;
    });

    if (captureMoves.length > 0) {
      // 选择提子最多的着法
      let bestMove = captureMoves[0];
      let maxCapture = this.rules.countWouldCapture(bestMove.x, bestMove.y, color);

      for (const move of captureMoves) {
        const captureCount = this.rules.countWouldCapture(move.x, move.y, color);
        if (captureCount > maxCapture) {
          maxCapture = captureCount;
          bestMove = move;
        }
      }

      return bestMove;
    }

    // 否则选择中腹或重要位置
    return this.selectRandomMove(movesToConsider);
  }

  /**
   * 获取终盘得分
   */
  async finalScore(): Promise<string> {
    this.log('计算终盘得分');
    await this.delay(100);

    // 简单计算：数子法
    const stones = this.board.countStones();
    const captures = this.board.getCaptures();

    // 黑棋得分 = 黑子数 + 提掉的白子数
    const blackScore = stones.black + captures.white;
    // 白棋得分 = 白子数 + 提掉的黑子数 + 贴目
    const whiteScore = stones.white + captures.black + this.komi;

    const diff = blackScore - whiteScore;

    if (diff > 0) {
      return `B+${diff.toFixed(1)}`;
    } else if (diff < 0) {
      return `W+${Math.abs(diff).toFixed(1)}`;
    } else {
      return '0';
    }
  }

  /**
   * 停止引擎
   */
  async quit(): Promise<void> {
    this.log('Mock引擎停止');
    this.isReady = false;
    await this.delay(10);
  }

  /**
   * 检查引擎是否就绪
   */
  isEngineReady(): boolean {
    return this.isReady;
  }

  /**
   * 获取引擎名称
   */
  getName(): string {
    return 'MockEngine';
  }

  /**
   * 获取引擎版本
   */
  getVersion(): string {
    return '1.0.0';
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 日志输出
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[MockEngine] ${message}`);
    }
  }

  /**
   * 获取当前棋盘状态（用于调试）
   */
  getBoardState(): string[][] {
    const grid = this.board.getGrid();
    return grid.map((row) =>
      row.map((stone) => {
        if (stone === 'black') return 'B';
        if (stone === 'white') return 'W';
        return '.';
      })
    );
  }

  /**
   * 打印棋盘（用于调试）
   */
  printBoard(): void {
    this.board.print();
  }
}
