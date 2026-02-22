import React from 'react';
import { BoardSize } from '../../../shared/types';
import { getStarPoints } from '../../../main/utils/coordinate';
import './Grid.css';

interface GridProps {
  boardSize: BoardSize;
  cellSize: number;
  padding: number;
}

const Grid: React.FC<GridProps> = ({ boardSize, cellSize, padding }) => {
  // 获取星位
  const starPoints = getStarPoints(boardSize);

  // 生成横线
  const horizontalLines = Array.from({ length: boardSize }, (_, i) => (
    <line
      key={`h-${i}`}
      x1={padding}
      y1={padding + i * cellSize}
      x2={padding + (boardSize - 1) * cellSize}
      y2={padding + i * cellSize}
      stroke="#000"
      strokeWidth="1"
    />
  ));

  // 生成竖线
  const verticalLines = Array.from({ length: boardSize }, (_, i) => (
    <line
      key={`v-${i}`}
      x1={padding + i * cellSize}
      y1={padding}
      x2={padding + i * cellSize}
      y2={padding + (boardSize - 1) * cellSize}
      stroke="#000"
      strokeWidth="1"
    />
  ));

  // 生成星位标记
  const starPointMarkers = starPoints.map((point, index) => (
    <circle
      key={`star-${index}`}
      cx={padding + point.x * cellSize}
      cy={padding + point.y * cellSize}
      r={cellSize * 0.1}
      fill="#000"
    />
  ));

  // 生成坐标标签
  const coordinateLabels = [];
  
  // 横坐标（A-T，跳过I）
  const letters = 'ABCDEFGHJKLMNOPQRST'.split('');
  for (let i = 0; i < boardSize; i++) {
    coordinateLabels.push(
      <text
        key={`coord-h-top-${i}`}
        x={padding + i * cellSize}
        y={padding - 10}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
      >
        {letters[i]}
      </text>
    );
    coordinateLabels.push(
      <text
        key={`coord-h-bottom-${i}`}
        x={padding + i * cellSize}
        y={padding + (boardSize - 1) * cellSize + 20}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
      >
        {letters[i]}
      </text>
    );
  }

  // 纵坐标（数字）
  for (let i = 0; i < boardSize; i++) {
    coordinateLabels.push(
      <text
        key={`coord-v-left-${i}`}
        x={padding - 15}
        y={padding + i * cellSize + 4}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
      >
        {boardSize - i}
      </text>
    );
    coordinateLabels.push(
      <text
        key={`coord-v-right-${i}`}
        x={padding + (boardSize - 1) * cellSize + 15}
        y={padding + i * cellSize + 4}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
      >
        {boardSize - i}
      </text>
    );
  }

  return (
    <svg
      className="board-grid"
      width={cellSize * (boardSize - 1) + padding * 2}
      height={cellSize * (boardSize - 1) + padding * 2}
    >
      {horizontalLines}
      {verticalLines}
      {starPointMarkers}
      {coordinateLabels}
    </svg>
  );
};

export default Grid;
