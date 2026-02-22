/**
 * 坐标转换工具
 * 处理GTP坐标和数组索引之间的转换
 */

import { Coordinate, BoardSize } from '../../shared/types';

/**
 * GTP坐标字母表（跳过I）
 * A-H, J-T 对应 0-18
 */
const GTP_LETTERS = 'ABCDEFGHJKLMNOPQRST';

/**
 * 将数组坐标转换为GTP坐标
 * @param coord 数组坐标 {x, y}，0-based
 * @param boardSize 棋盘大小
 * @returns GTP坐标字符串，如 "Q16"
 * @example coordinateToGTP({x: 15, y: 2}, 19) => "Q3"
 */
export function coordinateToGTP(coord: Coordinate, boardSize: BoardSize): string {
  if (!isValidCoordinate(coord, boardSize)) {
    throw new Error(`无效坐标: (${coord.x}, ${coord.y})，棋盘大小: ${boardSize}`);
  }

  const colLetter = GTP_LETTERS[coord.x];
  const row = boardSize - coord.y; // GTP行号从下往上，数组索引从上往下
  
  return `${colLetter}${row}`;
}

/**
 * 将GTP坐标转换为数组坐标
 * @param gtpCoord GTP坐标字符串，如 "Q16"
 * @param boardSize 棋盘大小
 * @returns 数组坐标 {x, y}，0-based
 * @example gtpCoordinateToArray("Q3", 19) => {x: 15, y: 16}
 */
export function gtpCoordinateToArray(gtpCoord: string, boardSize: BoardSize): Coordinate {
  // 处理特殊情况
  const normalized = gtpCoord.trim().toUpperCase();
  
  if (normalized === 'PASS' || normalized === 'RESIGN') {
    return { x: -1, y: -1 };
  }

  // 解析GTP坐标
  const match = normalized.match(/^([A-HJ-T])(\d+)$/);
  if (!match) {
    throw new Error(`无效的GTP坐标格式: ${gtpCoord}`);
  }

  const colLetter = match[1];
  const row = parseInt(match[2], 10);

  // 转换为数组索引
  const x = GTP_LETTERS.indexOf(colLetter);
  const y = boardSize - row; // GTP行号从下往上，数组索引从上往下

  if (x === -1 || row < 1 || row > boardSize) {
    throw new Error(`GTP坐标超出范围: ${gtpCoord}，棋盘大小: ${boardSize}`);
  }

  const coord = { x, y };
  
  if (!isValidCoordinate(coord, boardSize)) {
    throw new Error(`转换后的坐标无效: (${x}, ${y})，棋盘大小: ${boardSize}`);
  }

  return coord;
}

/**
 * 检查坐标是否有效
 * @param coord 数组坐标
 * @param boardSize 棋盘大小
 * @returns 是否有效
 */
export function isValidCoordinate(coord: Coordinate, boardSize: BoardSize): boolean {
  return (
    coord.x >= 0 &&
    coord.x < boardSize &&
    coord.y >= 0 &&
    coord.y < boardSize
  );
}

/**
 * 获取相邻坐标（上下左右）
 * @param coord 中心坐标
 * @param boardSize 棋盘大小
 * @returns 相邻坐标数组
 */
export function getNeighbors(coord: Coordinate, boardSize: BoardSize): Coordinate[] {
  const neighbors: Coordinate[] = [];
  const directions = [
    { dx: 0, dy: -1 }, // 上
    { dx: 1, dy: 0 },  // 右
    { dx: 0, dy: 1 },  // 下
    { dx: -1, dy: 0 }, // 左
  ];

  for (const dir of directions) {
    const neighbor = {
      x: coord.x + dir.dx,
      y: coord.y + dir.dy,
    };

    if (isValidCoordinate(neighbor, boardSize)) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

/**
 * 获取对角相邻坐标
 * @param coord 中心坐标
 * @param boardSize 棋盘大小
 * @returns 对角相邻坐标数组
 */
export function getDiagonalNeighbors(coord: Coordinate, boardSize: BoardSize): Coordinate[] {
  const neighbors: Coordinate[] = [];
  const directions = [
    { dx: -1, dy: -1 }, // 左上
    { dx: 1, dy: -1 },  // 右上
    { dx: 1, dy: 1 },   // 右下
    { dx: -1, dy: 1 },  // 左下
  ];

  for (const dir of directions) {
    const neighbor = {
      x: coord.x + dir.dx,
      y: coord.y + dir.dy,
    };

    if (isValidCoordinate(neighbor, boardSize)) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

/**
 * 计算两个坐标之间的曼哈顿距离
 * @param coord1 坐标1
 * @param coord2 坐标2
 * @returns 曼哈顿距离
 */
export function manhattanDistance(coord1: Coordinate, coord2: Coordinate): number {
  return Math.abs(coord1.x - coord2.x) + Math.abs(coord1.y - coord2.y);
}

/**
 * 检查两个坐标是否相等
 * @param coord1 坐标1
 * @param coord2 坐标2
 * @returns 是否相等
 */
export function coordinatesEqual(coord1: Coordinate, coord2: Coordinate): boolean {
  return coord1.x === coord2.x && coord1.y === coord2.y;
}

/**
 * 将坐标转换为字符串键（用于Map/Set）
 * @param coord 坐标
 * @returns 字符串键，如 "15,2"
 */
export function coordinateToKey(coord: Coordinate): string {
  return `${coord.x},${coord.y}`;
}

/**
 * 将字符串键转换为坐标
 * @param key 字符串键，如 "15,2"
 * @returns 坐标
 */
export function keyToCoordinate(key: string): Coordinate {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

/**
 * 获取星位坐标
 * @param boardSize 棋盘大小
 * @returns 星位坐标数组
 */
export function getStarPoints(boardSize: BoardSize): Coordinate[] {
  const starPoints: Coordinate[] = [];

  if (boardSize === 19) {
    // 19路棋盘：9个星位
    const positions = [3, 9, 15]; // 4-4点、天元
    for (const x of positions) {
      for (const y of positions) {
        starPoints.push({ x, y });
      }
    }
  } else if (boardSize === 13) {
    // 13路棋盘：5个星位
    const corners = [3, 9]; // 4-4点
    const center = 6; // 天元
    for (const x of corners) {
      for (const y of corners) {
        starPoints.push({ x, y });
      }
    }
    starPoints.push({ x: center, y: center });
  } else if (boardSize === 9) {
    // 9路棋盘：5个星位
    const corners = [2, 6]; // 3-3点
    const center = 4; // 天元
    for (const x of corners) {
      for (const y of corners) {
        starPoints.push({ x, y });
      }
    }
    starPoints.push({ x: center, y: center });
  }

  return starPoints;
}

/**
 * 获取让子位置
 * @param handicap 让子数（2-9）
 * @param boardSize 棋盘大小
 * @returns 让子位置坐标数组
 */
export function getHandicapPositions(handicap: number, boardSize: BoardSize): Coordinate[] {
  if (handicap < 2 || handicap > 9) {
    throw new Error(`让子数必须在2-9之间: ${handicap}`);
  }

  const positions: Coordinate[] = [];

  // 根据棋盘大小确定基准位置
  let offset: number;
  if (boardSize === 19) {
    offset = 3; // 4-4点
  } else if (boardSize === 13) {
    offset = 3; // 4-4点
  } else if (boardSize === 9) {
    offset = 2; // 3-3点
  } else {
    throw new Error(`不支持的棋盘大小: ${boardSize}`);
  }

  const high = boardSize - 1 - offset;
  const low = offset;
  const mid = Math.floor(boardSize / 2);

  // 标准让子位置顺序
  const standardPositions: Coordinate[] = [
    { x: high, y: low },   // 右上
    { x: low, y: high },   // 左下
    { x: high, y: high },  // 右下
    { x: low, y: low },    // 左上
    { x: mid, y: mid },    // 天元
    { x: low, y: mid },    // 左边
    { x: high, y: mid },   // 右边
    { x: mid, y: low },    // 上边
    { x: mid, y: high },   // 下边
  ];

  // 根据让子数选择位置
  if (handicap === 2) {
    positions.push(standardPositions[0], standardPositions[1]);
  } else if (handicap === 3) {
    positions.push(standardPositions[0], standardPositions[1], standardPositions[2]);
  } else if (handicap === 4) {
    positions.push(standardPositions[0], standardPositions[1], standardPositions[2], standardPositions[3]);
  } else if (handicap === 5) {
    positions.push(
      standardPositions[0],
      standardPositions[1],
      standardPositions[2],
      standardPositions[3],
      standardPositions[4]
    );
  } else if (handicap === 6) {
    positions.push(
      standardPositions[0],
      standardPositions[1],
      standardPositions[2],
      standardPositions[3],
      standardPositions[5],
      standardPositions[6]
    );
  } else if (handicap === 7) {
    positions.push(
      standardPositions[0],
      standardPositions[1],
      standardPositions[2],
      standardPositions[3],
      standardPositions[4],
      standardPositions[5],
      standardPositions[6]
    );
  } else if (handicap === 8) {
    positions.push(
      standardPositions[0],
      standardPositions[1],
      standardPositions[2],
      standardPositions[3],
      standardPositions[5],
      standardPositions[6],
      standardPositions[7],
      standardPositions[8]
    );
  } else if (handicap === 9) {
    positions.push(...standardPositions);
  }

  return positions;
}
