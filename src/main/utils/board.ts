/**
 * 棋盘数据结构
 * 管理棋盘状态、棋子放置、提子计算等
 */

import { StoneColor, BoardSize, Coordinate, Move } from '../../shared/types';
import {
  isValidCoordinate,
  getNeighbors,
  coordinateToKey,
} from './coordinate';

/**
 * 棋盘类
 */
export class Board {
  private size: BoardSize;
  private grid: StoneColor[][];
  private moveHistory: Move[];
  private capturedBlack: number;
  private capturedWhite: number;

  constructor(size: BoardSize = 19) {
    this.size = size;
    this.grid = this.createEmptyGrid(size);
    this.moveHistory = [];
    this.capturedBlack = 0;
    this.capturedWhite = 0;
  }

  /**
   * 创建空棋盘
   */
  private createEmptyGrid(size: number): StoneColor[][] {
    return Array.from({ length: size }, () =>
      Array.from({ length: size }, () => 'empty' as StoneColor)
    );
  }

  /**
   * 获取棋盘大小
   */
  getSize(): BoardSize {
    return this.size;
  }

  /**
   * 获取棋盘状态（深拷贝）
   */
  getGrid(): StoneColor[][] {
    return this.grid.map((row) => [...row]);
  }

  /**
   * 获取指定位置的棋子颜色
   */
  getStone(x: number, y: number): StoneColor {
    if (!isValidCoordinate({ x, y }, this.size)) {
      throw new Error(`无效坐标: (${x}, ${y})`);
    }
    return this.grid[y][x];
  }

  /**
   * 获取着法历史
   */
  getMoveHistory(): Move[] {
    return [...this.moveHistory];
  }

  /**
   * 获取提子数
   */
  getCaptures(): { black: number; white: number } {
    return {
      black: this.capturedBlack,
      white: this.capturedWhite,
    };
  }

  /**
   * 放置棋子（不验证规则，仅更新棋盘）
   */
  placeStone(color: StoneColor, x: number, y: number): void {
    if (!isValidCoordinate({ x, y }, this.size)) {
      throw new Error(`无效坐标: (${x}, ${y})`);
    }

    if (color === 'empty') {
      throw new Error('不能放置空棋子');
    }

    this.grid[y][x] = color;
  }

  /**
   * 移除棋子
   */
  removeStone(x: number, y: number): void {
    if (!isValidCoordinate({ x, y }, this.size)) {
      throw new Error(`无效坐标: (${x}, ${y})`);
    }

    this.grid[y][x] = 'empty';
  }

  /**
   * 检查位置是否为空
   */
  isEmpty(x: number, y: number): boolean {
    return this.getStone(x, y) === 'empty';
  }

  /**
   * 查找连通块（同色棋子组成的连通区域）
   * 使用深度优先搜索
   */
  findConnectedGroup(x: number, y: number): Coordinate[] {
    const color = this.getStone(x, y);
    if (color === 'empty') {
      return [];
    }

    const group: Coordinate[] = [];
    const visited = new Set<string>();
    const stack: Coordinate[] = [{ x, y }];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = coordinateToKey(current);

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      group.push(current);

      // 检查相邻位置
      const neighbors = getNeighbors(current, this.size);
      for (const neighbor of neighbors) {
        const neighborKey = coordinateToKey(neighbor);
        if (!visited.has(neighborKey) && this.getStone(neighbor.x, neighbor.y) === color) {
          stack.push(neighbor);
        }
      }
    }

    return group;
  }

  /**
   * 计算连通块的气（自由度）
   * 气是指连通块周围的空位数量
   */
  countLiberties(group: Coordinate[]): number {
    const liberties = new Set<string>();

    for (const stone of group) {
      const neighbors = getNeighbors(stone, this.size);
      for (const neighbor of neighbors) {
        if (this.isEmpty(neighbor.x, neighbor.y)) {
          liberties.add(coordinateToKey(neighbor));
        }
      }
    }

    return liberties.size;
  }

  /**
   * 获取连通块的所有气的位置
   */
  getLibertyPositions(group: Coordinate[]): Coordinate[] {
    const liberties = new Set<string>();

    for (const stone of group) {
      const neighbors = getNeighbors(stone, this.size);
      for (const neighbor of neighbors) {
        if (this.isEmpty(neighbor.x, neighbor.y)) {
          liberties.add(coordinateToKey(neighbor));
        }
      }
    }

    return Array.from(liberties).map((key) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }

  /**
   * 移除无气的棋子组（提子）
   * @param color 要检查的棋子颜色
   * @returns 被提掉的棋子坐标数组
   */
  removeCapturedStones(color: StoneColor): Coordinate[] {
    if (color === 'empty') {
      return [];
    }

    const captured: Coordinate[] = [];
    const checked = new Set<string>();

    // 遍历棋盘，查找所有该颜色的棋子
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const key = coordinateToKey({ x, y });
        if (checked.has(key)) {
          continue;
        }

        if (this.getStone(x, y) === color) {
          const group = this.findConnectedGroup(x, y);
          const liberties = this.countLiberties(group);

          // 标记该组所有棋子为已检查
          for (const stone of group) {
            checked.add(coordinateToKey(stone));
          }

          // 如果没有气，提掉整个组
          if (liberties === 0) {
            for (const stone of group) {
              this.removeStone(stone.x, stone.y);
              captured.push(stone);
            }
          }
        }
      }
    }

    // 更新提子统计
    if (captured.length > 0) {
      if (color === 'black') {
        this.capturedBlack += captured.length;
      } else {
        this.capturedWhite += captured.length;
      }
    }

    return captured;
  }

  /**
   * 添加着法到历史记录
   */
  addMove(move: Move): void {
    this.moveHistory.push(move);
  }

  /**
   * 重置棋盘
   */
  reset(): void {
    this.grid = this.createEmptyGrid(this.size);
    this.moveHistory = [];
    this.capturedBlack = 0;
    this.capturedWhite = 0;
  }

  /**
   * 改变棋盘大小（会重置棋盘）
   */
  resize(newSize: BoardSize): void {
    this.size = newSize;
    this.reset();
  }

  /**
   * 克隆棋盘（用于模拟着法）
   */
  clone(): Board {
    const cloned = new Board(this.size);
    cloned.grid = this.grid.map((row) => [...row]);
    cloned.moveHistory = [...this.moveHistory];
    cloned.capturedBlack = this.capturedBlack;
    cloned.capturedWhite = this.capturedWhite;
    return cloned;
  }

  /**
   * 从另一个棋盘复制状态
   */
  copyFrom(other: Board): void {
    this.size = other.size;
    this.grid = other.grid.map((row) => [...row]);
    this.moveHistory = [...other.moveHistory];
    this.capturedBlack = other.capturedBlack;
    this.capturedWhite = other.capturedWhite;
  }

  /**
   * 获取棋盘上所有棋子的位置
   */
  getAllStones(): { black: Coordinate[]; white: Coordinate[] } {
    const black: Coordinate[] = [];
    const white: Coordinate[] = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const color = this.getStone(x, y);
        if (color === 'black') {
          black.push({ x, y });
        } else if (color === 'white') {
          white.push({ x, y });
        }
      }
    }

    return { black, white };
  }

  /**
   * 计算棋盘上的棋子数量
   */
  countStones(): { black: number; white: number; empty: number } {
    let black = 0;
    let white = 0;
    let empty = 0;

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const color = this.getStone(x, y);
        if (color === 'black') {
          black++;
        } else if (color === 'white') {
          white++;
        } else {
          empty++;
        }
      }
    }

    return { black, white, empty };
  }

  /**
   * 检查两个棋盘状态是否相同
   */
  equals(other: Board): boolean {
    if (this.size !== other.size) {
      return false;
    }

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.getStone(x, y) !== other.getStone(x, y)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 获取棋盘的哈希值（用于打劫检测）
   */
  getHash(): string {
    let hash = '';
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const stone = this.getStone(x, y);
        hash += stone === 'black' ? 'B' : stone === 'white' ? 'W' : '.';
      }
    }
    return hash;
  }

  /**
   * 打印棋盘（用于调试）
   */
  print(): void {
    console.log('\n  ' + Array.from({ length: this.size }, (_, i) => String.fromCharCode(65 + i)).join(' '));
    for (let y = 0; y < this.size; y++) {
      const row = this.grid[y]
        .map((stone) => {
          if (stone === 'black') return '●';
          if (stone === 'white') return '○';
          return '·';
        })
        .join(' ');
      console.log(`${String(this.size - y).padStart(2)} ${row}`);
    }
    console.log('');
  }
}
