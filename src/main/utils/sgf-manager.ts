/**
 * SGF (Smart Game Format) 棋谱管理器
 * 负责导入和导出 SGF 格式的围棋棋谱
 */

import { GameState, Move, BoardSize } from '../../shared/types';
import { coordinateToGTP } from './coordinate';

/**
 * SGF 属性接口
 */
interface SGFProperties {
  [key: string]: string[];
}

/**
 * SGF 节点接口
 */
interface SGFNode {
  properties: SGFProperties;
  children: SGFNode[];
}

/**
 * SGF 游戏信息
 */
export interface SGFGameInfo {
  boardSize: number;
  komi: number;
  handicap: number;
  blackPlayer?: string;
  whitePlayer?: string;
  result?: string;
  date?: string;
  event?: string;
  round?: string;
  place?: string;
  rules?: string;
  timeLimit?: string;
}

/**
 * SGF 管理器类
 */
export class SGFManager {
  /**
   * 从 SGF 字符串解析游戏信息和着法
   */
  static parseSGF(sgfContent: string): {
    gameInfo: SGFGameInfo;
    moves: Move[];
  } {
    // 移除注释和多余空白
    const cleaned = sgfContent.replace(/\s+/g, ' ').trim();
    
    // 解析 SGF 树
    const rootNode = this.parseNode(cleaned);
    
    // 提取游戏信息
    const gameInfo = this.extractGameInfo(rootNode);
    
    // 提取着法序列
    const moves = this.extractMoves(rootNode, gameInfo.boardSize);
    
    return { gameInfo, moves };
  }

  /**
   * 将游戏状态导出为 SGF 格式
   */
  static exportToSGF(gameState: GameState, gameInfo?: Partial<SGFGameInfo>): string {
    const lines: string[] = [];
    
    // SGF 头部
    lines.push('(;');
    
    // 游戏信息
    lines.push('FF[4]');  // SGF 版本
    lines.push('GM[1]');  // 游戏类型：围棋
    lines.push(`SZ[${gameState.boardSize}]`);  // 棋盘大小
    lines.push(`KM[${gameState.komi}]`);  // 贴目
    lines.push(`RU[Chinese]`);  // 规则
    
    if (gameState.handicap > 0) {
      lines.push(`HA[${gameState.handicap}]`);  // 让子数
    }
    
    // 玩家名称：优先使用 gameInfo，否则从 AI 配置自动填充
    const blackName = gameInfo?.blackPlayer || `${gameState.aiBlack.name} (${gameState.aiBlack.engineType})`;
    const whiteName = gameInfo?.whitePlayer || `${gameState.aiWhite.name} (${gameState.aiWhite.engineType})`;
    lines.push(`PB[${blackName}]`);
    lines.push(`PW[${whiteName}]`);
    
    // 终局结果
    if (gameInfo?.result) {
      lines.push(`RE[${gameInfo.result}]`);
    }
    
    // 日期
    if (gameInfo?.date) {
      lines.push(`DT[${gameInfo.date}]`);
    } else {
      lines.push(`DT[${new Date().toISOString().split('T')[0]}]`);
    }
    if (gameInfo?.event) {
      lines.push(`EV[${gameInfo.event}]`);
    }
    if (gameInfo?.round) {
      lines.push(`RO[${gameInfo.round}]`);
    }
    if (gameInfo?.place) {
      lines.push(`PC[${gameInfo.place}]`);
    }
    if (gameInfo?.rules) {
      lines.push(`RU[${gameInfo.rules}]`);
    }
    if (gameInfo?.timeLimit) {
      lines.push(`TM[${gameInfo.timeLimit}]`);
    }
    
    // 应用名称
    lines.push('AP[GoSim:1.0]');
    
    // 着法序列
    for (const move of gameState.moveHistory) {
      if (move.gtpCoordinate === 'pass') {
        // Pass 着法
        const colorCode = move.color === 'black' ? 'B' : 'W';
        lines.push(`;${colorCode}[]`);
      } else if (move.gtpCoordinate === 'resign') {
        // 认输（通常不记录在 SGF 中，而是记录在结果中）
        continue;
      } else {
        // 正常着法
        const sgfCoord = this.coordinateToSGF(move.coordinate, gameState.boardSize);
        const colorCode = move.color === 'black' ? 'B' : 'W';
        lines.push(`;${colorCode}[${sgfCoord}]`);
      }
    }
    
    // SGF 结尾
    lines.push(')');
    
    return lines.join('\n');
  }

  /**
   * 解析 SGF 节点
   */
  private static parseNode(sgf: string): SGFNode {
    const root: SGFNode = {
      properties: {},
      children: [],
    };
    
    let current = root;
    let i = 0;
    
    while (i < sgf.length) {
      const char = sgf[i];
      
      if (char === '(') {
        // 开始新的变化
        i++;
      } else if (char === ')') {
        // 结束当前变化
        i++;
      } else if (char === ';') {
        // 新节点
        const node: SGFNode = {
          properties: {},
          children: [],
        };
        
        i++;
        
        // 解析属性
        while (i < sgf.length && sgf[i] !== ';' && sgf[i] !== '(' && sgf[i] !== ')') {
          if (sgf[i] === ' ') {
            i++;
            continue;
          }
          
          // 读取属性名
          let propName = '';
          while (i < sgf.length && /[A-Z]/.test(sgf[i])) {
            propName += sgf[i];
            i++;
          }
          
          if (!propName) {
            i++;
            continue;
          }
          
          // 读取属性值
          const values: string[] = [];
          while (i < sgf.length && sgf[i] === '[') {
            i++; // 跳过 '['
            let value = '';
            while (i < sgf.length && sgf[i] !== ']') {
              if (sgf[i] === '\\' && i + 1 < sgf.length) {
                // 转义字符
                i++;
                value += sgf[i];
              } else {
                value += sgf[i];
              }
              i++;
            }
            i++; // 跳过 ']'
            values.push(value);
          }
          
          node.properties[propName] = values;
        }
        
        current.children.push(node);
        current = node;
      } else {
        i++;
      }
    }
    
    return root;
  }

  /**
   * 提取游戏信息
   */
  private static extractGameInfo(rootNode: SGFNode): SGFGameInfo {
    const props = rootNode.children[0]?.properties || {};
    
    return {
      boardSize: parseInt(props.SZ?.[0] || '19'),
      komi: parseFloat(props.KM?.[0] || '0'),
      handicap: parseInt(props.HA?.[0] || '0'),
      blackPlayer: props.PB?.[0],
      whitePlayer: props.PW?.[0],
      result: props.RE?.[0],
      date: props.DT?.[0],
      event: props.EV?.[0],
      round: props.RO?.[0],
      place: props.PC?.[0],
      rules: props.RU?.[0],
      timeLimit: props.TM?.[0],
    };
  }

  /**
   * 提取着法序列
   */
  private static extractMoves(rootNode: SGFNode, boardSize: number): Move[] {
    const moves: Move[] = [];
    let moveNumber = 1;
    
    const traverseNodes = (node: SGFNode) => {
      const props = node.properties;
      
      // 检查黑棋着法
      if (props.B) {
        const sgfCoord = props.B[0];
        if (sgfCoord === '' || sgfCoord === 'tt') {
          // Pass
          moves.push({
            color: 'black',
            coordinate: { x: -1, y: -1 },
            gtpCoordinate: 'pass',
            timestamp: Date.now(),
            moveNumber: moveNumber++,
          });
        } else {
          const coord = this.sgfToCoordinate(sgfCoord, boardSize);
          moves.push({
            color: 'black',
            coordinate: coord,
            gtpCoordinate: coordinateToGTP(coord, boardSize as BoardSize),
            timestamp: Date.now(),
            moveNumber: moveNumber++,
          });
        }
      }
      
      // 检查白棋着法
      if (props.W) {
        const sgfCoord = props.W[0];
        if (sgfCoord === '' || sgfCoord === 'tt') {
          // Pass
          moves.push({
            color: 'white',
            coordinate: { x: -1, y: -1 },
            gtpCoordinate: 'pass',
            timestamp: Date.now(),
            moveNumber: moveNumber++,
          });
        } else {
          const coord = this.sgfToCoordinate(sgfCoord, boardSize);
          moves.push({
            color: 'white',
            coordinate: coord,
            gtpCoordinate: coordinateToGTP(coord, boardSize as BoardSize),
            timestamp: Date.now(),
            moveNumber: moveNumber++,
          });
        }
      }
      
      // 递归处理子节点
      for (const child of node.children) {
        traverseNodes(child);
      }
    };
    
    // 从根节点的第一个子节点开始
    if (rootNode.children.length > 0) {
      traverseNodes(rootNode.children[0]);
    }
    
    return moves;
  }

  /**
   * 坐标转换：内部坐标 -> SGF 坐标
   * SGF 使用 aa-ss 格式（小写字母）
   */
  private static coordinateToSGF(coord: { x: number; y: number }, _boardSize: number): string {
    const letters = 'abcdefghijklmnopqrs';
    const col = letters[coord.x];
    const row = letters[coord.y]; // SGF [aa] 为左上角，内部 y=0 也是顶部
    return `${col}${row}`;
  }

  /**
   * 坐标转换：SGF 坐标 -> 内部坐标
   */
  private static sgfToCoordinate(sgfCoord: string, _boardSize: number): { x: number; y: number } {
    const letters = 'abcdefghijklmnopqrs';
    const col = letters.indexOf(sgfCoord[0]);
    const row = letters.indexOf(sgfCoord[1]);
    
    return {
      x: col,
      y: row, // SGF [aa] 为左上角
    };
  }

  /**
   * 验证 SGF 文件格式
   */
  static validateSGF(sgfContent: string): { valid: boolean; error?: string } {
    try {
      // 基本格式检查
      if (!sgfContent.trim().startsWith('(')) {
        return { valid: false, error: 'SGF 文件必须以 "(" 开头' };
      }
      
      if (!sgfContent.trim().endsWith(')')) {
        return { valid: false, error: 'SGF 文件必须以 ")" 结尾' };
      }
      
      // 尝试解析
      this.parseSGF(sgfContent);
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
}
