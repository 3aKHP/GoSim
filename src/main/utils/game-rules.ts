/**
 * 围棋规则验证类
 * 负责验证着法合法性、打劫检测、自杀手判断等
 */

import { StoneColor, Coordinate, MoveResult, Move } from '../../shared/types';
import { Board } from './board';
import { coordinateToGTP, coordinatesEqual } from './coordinate';

/**
 * 游戏规则类
 */
export class GameRules {
  private board: Board;
  private koPosition: Coordinate | null = null; // 打劫位置
  private boardHistory: string[] = []; // 棋盘历史（用于检测循环）
  private allowSuicide: boolean = false; // 是否允许自杀手
  private allowSuperko: boolean = true; // 是否检测超级劫

  constructor(board: Board, options?: { allowSuicide?: boolean; allowSuperko?: boolean }) {
    this.board = board;
    if (options) {
      this.allowSuicide = options.allowSuicide ?? false;
      this.allowSuperko = options.allowSuperko ?? true;
    }
  }

  /**
   * 执行着法
   * @param x X坐标
   * @param y Y坐标
   * @param color 棋子颜色
   * @returns 着法结果
   */
  playMove(x: number, y: number, color: StoneColor): MoveResult {
    if (color === 'empty') {
      return {
        success: false,
        error: '无效的棋子颜色',
      };
    }

    // 检查坐标是否有效
    if (x < 0 || x >= this.board.getSize() || y < 0 || y >= this.board.getSize()) {
      return {
        success: false,
        error: `坐标超出范围: (${x}, ${y})`,
      };
    }

    // 检查位置是否为空
    if (!this.board.isEmpty(x, y)) {
      return {
        success: false,
        error: `位置已有棋子: (${x}, ${y})`,
      };
    }

    // 检查是否违反打劫规则
    if (this.koPosition && coordinatesEqual({ x, y }, this.koPosition)) {
      return {
        success: false,
        error: '违反打劫规则',
      };
    }

    // 模拟着法，检查是否合法
    const simulatedBoard = this.board.clone();
    simulatedBoard.placeStone(color, x, y);

    // 提掉对方的无气棋子
    const opponentColor: StoneColor = color === 'black' ? 'white' : 'black';
    const capturedStones = simulatedBoard.removeCapturedStones(opponentColor);

    // 检查自杀手
    const ownGroup = simulatedBoard.findConnectedGroup(x, y);
    const ownLiberties = simulatedBoard.countLiberties(ownGroup);

    if (ownLiberties === 0 && capturedStones.length === 0) {
      if (!this.allowSuicide) {
        return {
          success: false,
          error: '自杀手（该着法会导致己方棋子无气）',
        };
      }
    }

    // 检查超级劫（全局同形）
    if (this.allowSuperko) {
      const boardHash = simulatedBoard.getHash();
      if (this.boardHistory.includes(boardHash)) {
        return {
          success: false,
          error: '违反超级劫规则（全局同形）',
        };
      }
    }

    // 着法合法，执行实际落子
    this.board.placeStone(color, x, y);
    const actualCaptured = this.board.removeCapturedStones(opponentColor);

    // 更新打劫位置
    this.updateKoPosition(x, y, actualCaptured);

    // 记录棋盘状态
    this.boardHistory.push(this.board.getHash());

    // 创建着法记录
    const move: Move = {
      color,
      coordinate: { x, y },
      gtpCoordinate: coordinateToGTP({ x, y }, this.board.getSize()),
      timestamp: Date.now(),
      moveNumber: this.board.getMoveHistory().length + 1,
      captured: actualCaptured.length,
    };

    this.board.addMove(move);

    return {
      success: true,
      move,
      captured: actualCaptured,
    };
  }

  /**
   * 更新打劫位置
   * 打劫的条件：
   * 1. 只提掉对方一个棋子
   * 2. 被提掉的棋子只有一口气
   * 3. 落子位置在被提掉棋子的气上
   */
  private updateKoPosition(x: number, y: number, captured: Coordinate[]): void {
    this.koPosition = null;

    if (captured.length === 1) {
      const capturedPos = captured[0];
      // 检查被提掉的棋子是否只有一口气（即落子位置）
      if (coordinatesEqual({ x, y }, capturedPos)) {
        // 这不是打劫，因为落子位置和被提位置相同（不可能）
        return;
      }

      // 简单打劫检测：如果只提一子，下一手不能立即在被提位置落子
      this.koPosition = capturedPos;
    }
  }

  /**
   * 检查着法是否合法（不实际执行）
   */
  isLegalMove(x: number, y: number, color: StoneColor): boolean {
    if (!this.board.isEmpty(x, y)) {
      return false;
    }

    // 使用模拟棋盘检查，不改变当前棋盘状态
    const simulatedBoard = this.board.clone();
    const simulatedRules = new GameRules(simulatedBoard, {
      allowSuicide: this.allowSuicide,
      allowSuperko: this.allowSuperko,
    });
    simulatedRules.koPosition = this.koPosition;
    simulatedRules.boardHistory = [...this.boardHistory];

    const result = simulatedRules.playMove(x, y, color);
    return result.success;
  }

  /**
   * 获取所有合法着法
   */
  getLegalMoves(color: StoneColor): Coordinate[] {
    const legalMoves: Coordinate[] = [];
    const size = this.board.getSize();

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (this.board.isEmpty(x, y)) {
          // 使用模拟棋盘检查
          const simulatedBoard = this.board.clone();
          const simulatedRules = new GameRules(simulatedBoard, {
            allowSuicide: this.allowSuicide,
            allowSuperko: this.allowSuperko,
          });
          simulatedRules.koPosition = this.koPosition;
          simulatedRules.boardHistory = [...this.boardHistory];

          const result = simulatedRules.playMove(x, y, color);
          if (result.success) {
            legalMoves.push({ x, y });
          }
        }
      }
    }

    return legalMoves;
  }

  /**
   * 检查是否为自杀手
   */
  isSuicideMove(x: number, y: number, color: StoneColor): boolean {
    if (!this.board.isEmpty(x, y)) {
      return false;
    }

    const simulatedBoard = this.board.clone();
    simulatedBoard.placeStone(color, x, y);

    // 先提掉对方的无气棋子
    const opponentColor: StoneColor = color === 'black' ? 'white' : 'black';
    const capturedStones = simulatedBoard.removeCapturedStones(opponentColor);

    // 检查己方是否无气
    const ownGroup = simulatedBoard.findConnectedGroup(x, y);
    const ownLiberties = simulatedBoard.countLiberties(ownGroup);

    return ownLiberties === 0 && capturedStones.length === 0;
  }

  /**
   * 检查是否违反打劫规则
   */
  isKoViolation(x: number, y: number): boolean {
    if (!this.koPosition) {
      return false;
    }
    return coordinatesEqual({ x, y }, this.koPosition);
  }

  /**
   * 清除打劫位置（在对方落子后）
   */
  clearKo(): void {
    this.koPosition = null;
  }

  /**
   * 获取当前打劫位置
   */
  getKoPosition(): Coordinate | null {
    return this.koPosition ? { ...this.koPosition } : null;
  }

  /**
   * 重置规则状态
   */
  reset(): void {
    this.koPosition = null;
    this.boardHistory = [];
  }

  /**
   * 计算某个位置落子后会提掉多少对方棋子
   */
  countWouldCapture(x: number, y: number, color: StoneColor): number {
    if (!this.board.isEmpty(x, y)) {
      return 0;
    }

    const simulatedBoard = this.board.clone();
    simulatedBoard.placeStone(color, x, y);

    const opponentColor: StoneColor = color === 'black' ? 'white' : 'black';
    const captured = simulatedBoard.removeCapturedStones(opponentColor);

    return captured.length;
  }

  /**
   * 检查某个位置是否是眼位（己方完全包围的空位）
   */
  isEye(x: number, y: number, color: StoneColor): boolean {
    if (!this.board.isEmpty(x, y)) {
      return false;
    }

    const size = this.board.getSize();

    // 检查直接相邻的四个位置
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.x >= 0 &&
        neighbor.x < size &&
        neighbor.y >= 0 &&
        neighbor.y < size
      ) {
        const neighborColor = this.board.getStone(neighbor.x, neighbor.y);
        if (neighborColor !== color) {
          return false;
        }
      }
    }

    // 检查对角位置（至少3个是己方棋子）
    const diagonals = [
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y + 1 },
    ];

    let ownDiagonals = 0;
    let validDiagonals = 0;

    for (const diagonal of diagonals) {
      if (
        diagonal.x >= 0 &&
        diagonal.x < size &&
        diagonal.y >= 0 &&
        diagonal.y < size
      ) {
        validDiagonals++;
        const diagonalColor = this.board.getStone(diagonal.x, diagonal.y);
        if (diagonalColor === color) {
          ownDiagonals++;
        }
      }
    }

    // 如果在边角，要求所有有效对角位置都是己方棋子
    // 如果在中腹，要求至少3个对角位置是己方棋子
    if (validDiagonals === 4) {
      return ownDiagonals >= 3;
    } else {
      return ownDiagonals === validDiagonals;
    }
  }

  /**
   * 执行停着（pass）
   */
  playPass(color: 'black' | 'white'): MoveResult {
    const move: Move = {
      color,
      coordinate: { x: -1, y: -1 },
      gtpCoordinate: 'pass',
      timestamp: Date.now(),
      moveNumber: this.board.getMoveHistory().length + 1,
      captured: 0,
    };

    this.board.addMove(move);
    this.clearKo(); // 停着后清除打劫限制

    return {
      success: true,
      move,
    };
  }

  /**
   * 检查游戏是否结束（连续两个pass）
   */
  isGameOver(): boolean {
    const history = this.board.getMoveHistory();
    if (history.length < 2) {
      return false;
    }

    const lastTwo = history.slice(-2);
    return (
      lastTwo[0].gtpCoordinate === 'pass' && lastTwo[1].gtpCoordinate === 'pass'
    );
  }

  /**
   * 获取最后一手棋
   */
  getLastMove(): Move | null {
    const history = this.board.getMoveHistory();
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * 计算终盘结果（简化数子法/中国规则）
   */
  calculateFinalScore(komi: number): any {
    const size = this.board.getSize();
    const grid = this.board.getGrid();
    
    // 标记已访问的交叉点
    const visited = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
    
    let blackArea = 0;
    let whiteArea = 0;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (visited[y][x]) continue;
        
        const stone = grid[y][x];
        if (stone === 'black') {
          blackArea++;
          visited[y][x] = true;
        } else if (stone === 'white') {
          whiteArea++;
          visited[y][x] = true;
        } else {
          // 空点，查找归属
          const { coords, owner } = this.findTerritoryOwner(x, y, grid, visited, size);
          if (owner === 'black') {
            blackArea += coords.length;
          } else if (owner === 'white') {
            whiteArea += coords.length;
          }
        }
      }
    }
    
    const blackScore = blackArea;
    const whiteScore = whiteArea + komi;
    
    return {
      blackScore,
      whiteScore,
      blackArea,
      whiteArea,
      winner: blackScore > whiteScore ? 'black' : 'white',
      margin: Math.abs(blackScore - whiteScore)
    };
  }

  /**
   * 辅助方法：查找空地归属
   */
  private findTerritoryOwner(startX: number, startY: number, grid: any[][], visited: boolean[][], size: number) {
    const queue = [{ x: startX, y: startY }];
    const coords: Coordinate[] = [];
    const borderColors = new Set<string>();
    
    let head = 0;
    while(head < queue.length) {
      const { x, y } = queue[head++];
      if (x < 0 || x >= size || y < 0 || y >= size || visited[y][x] || grid[y][x] !== 'empty') {
        if (x >= 0 && x < size && y >= 0 && y < size && grid[y][x] !== 'empty') {
          borderColors.add(grid[y][x]);
        }
        continue;
      }
      
      visited[y][x] = true;
      coords.push({ x, y });
      
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }
    
    let owner: 'black' | 'white' | 'neutral' = 'neutral';
    if (borderColors.size === 1) {
      owner = borderColors.has('black') ? 'black' : 'white';
    }
    
    return { coords, owner };
  }
}
