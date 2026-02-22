import React, { useState } from 'react';
import { Card, Tabs, Statistic, Row, Col, Progress, Tag, Divider } from 'antd';
import { TrophyOutlined, ClockCircleOutlined, FireOutlined } from '@ant-design/icons';
import { GameState, GameStatistics } from '../../../shared/types';
import './GameStats.css';

const { TabPane } = Tabs;

interface GameStatsProps {
  gameState: GameState;
  statistics: GameStatistics;
  onClose?: () => void;
}

const GameStats: React.FC<GameStatsProps> = ({ gameState, statistics, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');

  // 格式化时间
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  // 计算平均思考时间
  const avgBlackTime = statistics.moveTimes.black.length > 0
    ? statistics.moveTimes.black.reduce((a, b) => a + b, 0) / statistics.moveTimes.black.length
    : 0;
  
  const avgWhiteTime = statistics.moveTimes.white.length > 0
    ? statistics.moveTimes.white.reduce((a, b) => a + b, 0) / statistics.moveTimes.white.length
    : 0;

  const winnerText = statistics.winner === 'black' ? '黑棋' :
    statistics.winner === 'white' ? '白棋' : '平局';

  const winByText = statistics.winner === 'draw' ? '' :
    `胜${statistics.winBy.toFixed(1)}目`;

  return (
    <div className="game-stats">
      <Card
        title={
          <div className="stats-header">
            <TrophyOutlined style={{ marginRight: 8 }} />
            <span>对局统计</span>
          </div>
        }
        extra={onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 结果摘要 */}
          <TabPane tab="结果摘要" key="summary">
            <div className="summary-content">
              {/* 胜负结果 */}
              <div className={`result-banner ${statistics.winner}`}>
                <div className="result-winner">{winnerText}</div>
                {statistics.winner !== 'draw' && (
                  <div className="result-margin">{winByText}</div>
                )}
              </div>

              {/* 得分对比 */}
              <Row gutter={16} style={{ marginTop: 24 }}>
                <Col span={12}>
                  <Card className="score-card black-card">
                    <Statistic
                      title="黑棋得分"
                      value={statistics.blackScore}
                      precision={1}
                      valueStyle={{ color: '#000' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="score-card white-card">
                    <Statistic
                      title="白棋得分"
                      value={statistics.whiteScore}
                      precision={1}
                      valueStyle={{ color: '#666' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Divider />

              {/* 详细统计 */}
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title="总着法数"
                    value={statistics.totalMoves}
                    prefix={<FireOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="对局时长"
                    value={formatDuration(statistics.duration)}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="棋盘大小"
                    value={`${gameState.boardSize}×${gameState.boardSize}`}
                  />
                </Col>
              </Row>

              <Divider />

              {/* 对局信息 */}
              <div className="game-info-section">
                <h4>对局信息</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">贴目：</span>
                    <span className="info-value">{gameState.komi} 目</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">让子：</span>
                    <span className="info-value">
                      {gameState.handicap === 0 ? '无' : `${gameState.handicap} 子`}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">黑方AI：</span>
                    <span className="info-value">{gameState.aiBlack.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">白方AI：</span>
                    <span className="info-value">{gameState.aiWhite.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabPane>

          {/* 地盘分析 */}
          <TabPane tab="地盘分析" key="territory">
            <div className="territory-content">
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="黑棋地盘" className="territory-card">
                    <Statistic
                      title="实地"
                      value={statistics.blackTerritory}
                      suffix="目"
                    />
                    <Progress
                      percent={(statistics.blackTerritory / (statistics.blackTerritory + statistics.whiteTerritory)) * 100}
                      strokeColor="#000"
                      showInfo={false}
                    />
                    <Divider />
                    <div className="territory-details">
                      <div className="detail-item">
                        <span>提子数：</span>
                        <span>{statistics.blackCaptures}</span>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="白棋地盘" className="territory-card">
                    <Statistic
                      title="实地"
                      value={statistics.whiteTerritory}
                      suffix="目"
                    />
                    <Progress
                      percent={(statistics.whiteTerritory / (statistics.blackTerritory + statistics.whiteTerritory)) * 100}
                      strokeColor="#888"
                      showInfo={false}
                    />
                    <Divider />
                    <div className="territory-details">
                      <div className="detail-item">
                        <span>提子数：</span>
                        <span>{statistics.whiteCaptures}</span>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>

              <Divider />

              <div className="territory-summary">
                <h4>地盘对比</h4>
                <div className="comparison-bar">
                  <div
                    className="bar-segment black"
                    style={{
                      width: `${(statistics.blackTerritory / (statistics.blackTerritory + statistics.whiteTerritory)) * 100}%`
                    }}
                  >
                    {statistics.blackTerritory}
                  </div>
                  <div
                    className="bar-segment white"
                    style={{
                      width: `${(statistics.whiteTerritory / (statistics.blackTerritory + statistics.whiteTerritory)) * 100}%`
                    }}
                  >
                    {statistics.whiteTerritory}
                  </div>
                </div>
              </div>
            </div>
          </TabPane>

          {/* 着法统计 */}
          <TabPane tab="着法统计" key="moves">
            <div className="moves-content">
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="黑方着法" className="moves-card">
                    <Statistic
                      title="平均思考时间"
                      value={avgBlackTime.toFixed(2)}
                      suffix="秒"
                    />
                    <Divider />
                    <div className="move-stats">
                      <div className="stat-row">
                        <span>着法数：</span>
                        <span>{statistics.moveTimes.black.length}</span>
                      </div>
                      <div className="stat-row">
                        <span>最长思考：</span>
                        <span>{Math.max(...statistics.moveTimes.black, 0).toFixed(2)}秒</span>
                      </div>
                      <div className="stat-row">
                        <span>最短思考：</span>
                        <span>{Math.min(...statistics.moveTimes.black, 0).toFixed(2)}秒</span>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="白方着法" className="moves-card">
                    <Statistic
                      title="平均思考时间"
                      value={avgWhiteTime.toFixed(2)}
                      suffix="秒"
                    />
                    <Divider />
                    <div className="move-stats">
                      <div className="stat-row">
                        <span>着法数：</span>
                        <span>{statistics.moveTimes.white.length}</span>
                      </div>
                      <div className="stat-row">
                        <span>最长思考：</span>
                        <span>{Math.max(...statistics.moveTimes.white, 0).toFixed(2)}秒</span>
                      </div>
                      <div className="stat-row">
                        <span>最短思考：</span>
                        <span>{Math.min(...statistics.moveTimes.white, 0).toFixed(2)}秒</span>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>

              <Divider />

              <div className="efficiency-section">
                <h4>着法效率</h4>
                <p className="hint">平均每手用时越短，着法效率越高</p>
                <div className="efficiency-comparison">
                  <Tag color={avgBlackTime < avgWhiteTime ? 'green' : 'default'}>
                    黑方：{avgBlackTime.toFixed(2)}秒/手
                  </Tag>
                  <Tag color={avgWhiteTime < avgBlackTime ? 'green' : 'default'}>
                    白方：{avgWhiteTime.toFixed(2)}秒/手
                  </Tag>
                </div>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default GameStats;
