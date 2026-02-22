import React from 'react';
import { useGameStore } from '../../stores/game-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useUIStore } from '../../stores/ui-store';
import { BOARD_PADDING, CELL_SIZE } from '../../../shared/constants';
import Grid from './Grid';
import Stone from './Stone';
import './Board.css';

const Board: React.FC = () => {
  const { gameState } = useGameStore();
  const { settings } = useSettingsStore();
  const { hoverPosition, setHoverPosition } = useUIStore();

  const boardSize = settings?.boardSize || 19;
  const board = gameState?.board || [];

  // 计算棋盘尺寸
  const boardWidth = CELL_SIZE * (boardSize - 1) + BOARD_PADDING * 2;
  const boardHeight = CELL_SIZE * (boardSize - 1) + BOARD_PADDING * 2;

  // 处理鼠标移动
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - BOARD_PADDING;
    const mouseY = e.clientY - rect.top - BOARD_PADDING;

    const x = Math.round(mouseX / CELL_SIZE);
    const y = Math.round(mouseY / CELL_SIZE);

    if (y >= 0 && y < boardSize && x >= 0 && x < boardSize) {
      setHoverPosition({ x, y });
    } else {
      setHoverPosition(null);
    }
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  // 处理点击（预留，当前是AI对弈，不需要人工落子）
  const handleClick = () => {
    // 未来可以在这里实现人机对弈时的落子逻辑
  };

  return (
    <div className="board-wrapper">
      <div
        className="board"
        style={{
          width: boardWidth,
          height: boardHeight,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* 棋盘网格 */}
        <Grid
          boardSize={boardSize}
          cellSize={CELL_SIZE}
          padding={BOARD_PADDING}
        />

        {/* 渲染棋子 */}
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            if (cell !== null && cell !== 'empty') {
              return (
                <Stone
                  key={`${rowIndex}-${colIndex}`}
                  color={cell}
                  position={{ x: colIndex, y: rowIndex }}
                  cellSize={CELL_SIZE}
                  padding={BOARD_PADDING}
                />
              );
            }
            return null;
          })
        )}

        {/* 悬停提示 */}
        {hoverPosition && board[hoverPosition.y]?.[hoverPosition.x] === null && (
          <div
            className="hover-stone"
            style={{
              left: BOARD_PADDING + hoverPosition.x * CELL_SIZE,
              top: BOARD_PADDING + hoverPosition.y * CELL_SIZE,
              width: CELL_SIZE * 0.9,
              height: CELL_SIZE * 0.9,
            }}
          />
        )}
      </div>

      {/* 游戏信息显示 */}
      {gameState && (
        <div className="game-info">
          <div className="info-item">
            <span className="info-label">当前手数：</span>
            <span className="info-value">{gameState.moveNumber}</span>
          </div>
          <div className="info-item">
            <span className="info-label">黑方提子：</span>
            <span className="info-value">{gameState.capturedBlack}</span>
          </div>
          <div className="info-item">
            <span className="info-label">白方提子：</span>
            <span className="info-value">{gameState.capturedWhite}</span>
          </div>
          <div className="info-item">
            <span className="info-label">当前回合：</span>
            <span className={`info-value ${gameState.currentPlayer}`}>
              {gameState.currentPlayer === 'black' ? '黑方' : '白方'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Board;
