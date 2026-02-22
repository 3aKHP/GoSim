import React, { useState } from 'react';
import { useGameStore } from '../../stores/game-store';
import { GameOverResult } from '../../../shared/types';
import './GameOverModal.css';

const GameOverModal: React.FC = () => {
  const { gameResult, clearGameResult, startGame, gameState } = useGameStore();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!gameResult) return null;

  const getTitle = (result: GameOverResult): string => {
    if (result.winner === 'Draw') return '平局';
    return result.winner === 'B' ? '黑棋胜' : '白棋胜';
  };

  const getDescription = (result: GameOverResult): string => {
    if (result.winner === 'Draw') return '双方平局';
    const side = result.winner === 'B' ? '黑棋' : '白棋';
    if (result.score === 'Resign') return `${side}中盘胜（对方认输）`;
    return `${side}胜 ${result.score} 目`;
  };

  const getIcon = (result: GameOverResult): string => {
    if (result.winner === 'B') return '⚫';
    if (result.winner === 'W') return '⚪';
    return '🤝';
  };

  const handleRestart = () => {
    clearGameResult();
    if (gameState) {
      startGame(
        gameState.boardSize,
        gameState.aiBlack,
        gameState.aiWhite,
        gameState.komi,
        gameState.handicap
      );
    }
  };

  const handleDismiss = () => {
    clearGameResult();
  };

  const handleExportSGF = async () => {
    try {
      setSaveStatus(null);
      // 先通过 IPC 获取 SGF 字符串
      const sgfContent = await window.electronAPI.exportSGF();
      // 弹出系统保存对话框
      const filePath = await window.electronAPI.saveSGFFile(sgfContent);
      if (filePath) {
        setSaveStatus('保存成功');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (error: any) {
      console.error('导出 SGF 失败:', error);
      setSaveStatus('保存失败');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <div className="game-over-icon">{getIcon(gameResult)}</div>
        <h2 className="game-over-title">游戏结束</h2>
        <div className="game-over-winner">{getTitle(gameResult)}</div>
        <div className="game-over-detail">{getDescription(gameResult)}</div>
        {gameResult.raw && (
          <div className="game-over-raw">{gameResult.raw}</div>
        )}
        <div className="game-over-actions">
          <button className="game-over-btn secondary" onClick={handleDismiss}>
            查看棋盘
          </button>
          <button className="game-over-btn accent" onClick={handleExportSGF}>
            导出 SGF
          </button>
          <button className="game-over-btn primary" onClick={handleRestart}>
            重新开始
          </button>
        </div>
        {saveStatus && (
          <div className={`game-over-toast ${saveStatus === '保存成功' ? 'success' : 'error'}`}>
            {saveStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameOverModal;
