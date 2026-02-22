/**
 * GameLogger - 游戏运行时日志模块
 * 将 GTP 通信、游戏事件、胜率变化等写入日志文件
 */
import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export class GameLogger {
  private logStream: fs.WriteStream | null = null;
  private logFilePath: string = '';
  private sessionId: string;
  private startTime: number;

  constructor(private logDir: string = 'debug/game_logs') {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  /**
   * 初始化日志文件（每次游戏开始时调用）
   */
  init(): void {
    try {
      // 确保日志目录存在
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // 生成日志文件名：YYMMDD-HHmmss.log
      const now = new Date();
      const timestamp = now.getFullYear().toString().slice(2) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '-' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');

      this.logFilePath = path.join(this.logDir, `game-${timestamp}-${this.sessionId}.log`);
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a', encoding: 'utf8' });
      this.startTime = Date.now();

      this.info('SESSION', `日志会话开始 sessionId=${this.sessionId}`);
      this.info('SESSION', `日志文件: ${this.logFilePath}`);
    } catch (err) {
      console.error(`[GameLogger] 初始化失败: ${err}`);
    }
  }

  /**
   * 写入日志
   */
  log(level: LogLevel, category: string, message: string): void {
    const elapsed = Date.now() - this.startTime;
    const line = `[${this.formatElapsed(elapsed)}] [${level}] [${category}] ${message}\n`;

    // 同时输出到控制台和文件
    if (level === 'ERROR') {
      console.error(line.trim());
    } else if (level === 'WARN') {
      console.warn(line.trim());
    }

    if (this.logStream) {
      this.logStream.write(line);
    }
  }

  debug(category: string, message: string): void {
    this.log('DEBUG', category, message);
  }

  info(category: string, message: string): void {
    this.log('INFO', category, message);
  }

  warn(category: string, message: string): void {
    this.log('WARN', category, message);
  }

  error(category: string, message: string): void {
    this.log('ERROR', category, message);
  }

  // --- GTP 通信专用日志 ---

  /**
   * 记录 GTP 命令发送
   */
  gtpCommand(engineId: string, command: string): void {
    this.debug('GTP', `[${engineId}] >>> ${command}`);
  }

  /**
   * 记录 GTP stdout chunk 到达
   */
  gtpStdoutChunk(engineId: string, data: string): void {
    const preview = JSON.stringify(data).substring(0, 200);
    this.debug('GTP', `[${engineId}] stdout chunk len=${data.length} ${preview}`);
  }

  /**
   * 记录 extractAnalyzeLines 处理结果
   */
  gtpExtractResult(engineId: string, bufferPreview: string, winrate: number): void {
    this.debug('GTP', `[${engineId}] after extract buffer=${bufferPreview} winrate=${winrate}`);
  }

  /**
   * 记录 GTP 响应解析
   */
  gtpResponse(engineId: string, rawResponse: string, parsedData: string, command: string): void {
    this.debug('GTP', `[${engineId}] response: "${rawResponse.substring(0, 80)}" → data="${parsedData}" cmd="${command}"`);
  }

  // --- 游戏事件日志 ---

  /**
   * 记录着法
   */
  move(moveNumber: number, color: string, coordinate: string, winrate: number): void {
    this.info('MOVE', `#${moveNumber} ${color} ${coordinate} winrate=${(winrate * 100).toFixed(1)}%`);
  }

  /**
   * 记录游戏开始
   */
  gameStart(boardSize: number, komi: number, blackEngine: string, whiteEngine: string): void {
    this.info('GAME', `开始 ${boardSize}x${boardSize} komi=${komi} 黑=${blackEngine} 白=${whiteEngine}`);
  }

  /**
   * 记录游戏结束
   */
  gameEnd(winner: string, score: string, reason: string): void {
    this.info('GAME', `结束 胜方=${winner} 比分=${score} 原因=${reason}`);
  }

  /**
   * 关闭日志
   */
  close(): void {
    if (this.logStream) {
      this.info('SESSION', '日志会话结束');
      this.logStream.end();
      this.logStream = null;
    }
  }

  /**
   * 获取当前日志文件路径
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  private formatElapsed(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const remainS = s % 60;
    const remainMs = ms % 1000;
    return `${String(m).padStart(2, '0')}:${String(remainS).padStart(2, '0')}.${String(remainMs).padStart(3, '0')}`;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

// 全局单例
let globalLogger: GameLogger | null = null;

export function getGameLogger(): GameLogger {
  if (!globalLogger) {
    globalLogger = new GameLogger();
    globalLogger.init();
  }
  return globalLogger;
}

export function resetGameLogger(): GameLogger {
  if (globalLogger) {
    globalLogger.close();
  }
  globalLogger = new GameLogger();
  globalLogger.init();
  return globalLogger;
}
