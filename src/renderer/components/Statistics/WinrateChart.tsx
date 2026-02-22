import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useGameStore } from '../../stores/game-store';
import './WinrateChart.css';

interface ChartDataPoint {
  move: number;
  winrate: number;
}

const WinrateChart: React.FC = () => {
  const { winrateHistory, currentWinrate } = useGameStore();

  const data: ChartDataPoint[] = useMemo(() => {
    return winrateHistory.map((wr, i) => ({
      move: i + 1,
      winrate: Math.round(wr * 1000) / 10, // 转为百分比，保留一位小数
    }));
  }, [winrateHistory]);

  // 自定义渐变：50% 线以上黑色，以下白色
  const gradientId = 'winrateGradient';

  const formatTooltip = (value: number | undefined) => value !== undefined ? `${value.toFixed(1)}%` : '';
  const formatYAxis = (value: number) => `${value}%`;

  if (data.length === 0) {
    return (
      <div className="winrate-chart-container">
        <div className="winrate-chart-header">
          <span className="winrate-chart-title">胜率曲线</span>
          {currentWinrate !== null && (
            <span className="winrate-current">
              当前：{(currentWinrate * 100).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="winrate-chart-empty">等待对局数据...</div>
      </div>
    );
  }

  return (
    <div className="winrate-chart-container">
      <div className="winrate-chart-header">
        <span className="winrate-chart-title">胜率曲线</span>
        {currentWinrate !== null && (
          <span className="winrate-current">
            当前：{(currentWinrate * 100).toFixed(1)}%
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#333" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#999" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#fff" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="move"
            tick={{ fontSize: 11 }}
            label={{ value: '手数', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => `第 ${label} 手`}
          />
          <ReferenceLine y={50} stroke="#888" strokeDasharray="4 4" label={{ value: '50%', position: 'left', fontSize: 10 }} />
          <Area
            type="monotone"
            dataKey="winrate"
            stroke="#1890ff"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            name="黑棋胜率"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="winrate-chart-legend">
        <span className="legend-black">⚫ 黑棋优势 (&gt;50%)</span>
        <span className="legend-white">⚪ 白棋优势 (&lt;50%)</span>
      </div>
    </div>
  );
};

export default WinrateChart;
