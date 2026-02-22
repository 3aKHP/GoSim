import React from 'react';
import { StoneColor, Coordinate } from '../../../shared/types';
import './Stone.css';

interface StoneProps {
  color: StoneColor;
  position: Coordinate;
  cellSize: number;
  padding: number;
  isLastMove?: boolean;
}

const Stone: React.FC<StoneProps> = ({ color, position, cellSize, padding, isLastMove = false }) => {
  const stoneSize = cellSize * 0.9;
  const left = padding + position.x * cellSize;
  const top = padding + position.y * cellSize;

  return (
    <div
      className={`stone ${color} ${isLastMove ? 'last-move' : ''}`}
      style={{
        left,
        top,
        width: stoneSize,
        height: stoneSize,
      }}
    >
      {isLastMove && <div className="last-move-marker" />}
    </div>
  );
};

// 使用 React.memo 优化性能，避免不必要的重渲染
// 只有当 props 发生变化时才重新渲染
export default React.memo(Stone);
